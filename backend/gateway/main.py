from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, List, Optional
import time
import uuid
import json
import hashlib
import httpx
import asyncio

app = FastAPI(title="AIIP Gateway Service", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Service endpoints
TRANSLATOR_URL = "http://localhost:8081"
LEDGER_URL = "http://localhost:8082"

# In-memory storage for routing and message tracking
registered_nodes = {}
message_queue = []
routing_table = {}

class NodeRegistration(BaseModel):
    node_id: str
    node_type: str  # "ai", "blockchain", "hybrid"
    capabilities: List[str]
    endpoint: Optional[str] = None

class Message(BaseModel):
    from_node: str
    to_node: str
    message_type: str
    data: Dict[str, Any]
    schema: Optional[str] = None

class RouteRequest(BaseModel):
    message: Message
    transform_schema: Optional[str] = None
    commit_to_ledger: bool = True

@app.get("/")
async def root():
    return {"service": "AIIP Gateway", "status": "active", "port": 8080}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.post("/nodes/register")
async def register_node(registration: NodeRegistration):
    """Register a node with the gateway"""
    # Register with ledger service first
    async with httpx.AsyncClient() as client:
        try:
            ledger_response = await client.post(
                f"{LEDGER_URL}/nodes/register",
                json={"node_id": registration.node_id}
            )
            ledger_data = ledger_response.json()
        except Exception as e:
            raise HTTPException(status_code=503, detail=f"Ledger service unavailable: {str(e)}")
    
    # Store node registration
    registered_nodes[registration.node_id] = {
        "node_id": registration.node_id,
        "node_type": registration.node_type,
        "capabilities": registration.capabilities,
        "endpoint": registration.endpoint,
        "public_key": ledger_data.get("public_key"),
        "private_key": ledger_data.get("private_key"),
        "registered_at": time.time(),
        "status": "active"
    }
    
    # Update routing table
    for capability in registration.capabilities:
        if capability not in routing_table:
            routing_table[capability] = []
        routing_table[capability].append(registration.node_id)
    
    return {
        "node_id": registration.node_id,
        "status": "registered",
        "public_key": ledger_data.get("public_key"),
        "private_key": ledger_data.get("private_key")
    }

@app.get("/nodes")
async def get_registered_nodes():
    """Get all registered nodes"""
    return {"nodes": list(registered_nodes.values())}

@app.get("/nodes/{node_id}")
async def get_node(node_id: str):
    """Get specific node information"""
    if node_id not in registered_nodes:
        raise HTTPException(status_code=404, detail="Node not found")
    return registered_nodes[node_id]

@app.post("/messages/send")
async def send_message(route_request: RouteRequest):
    """Route and process a message between nodes"""
    message = route_request.message
    
    # Validate nodes exist
    if message.from_node not in registered_nodes:
        raise HTTPException(status_code=404, detail="From node not registered")
    if message.to_node not in registered_nodes:
        raise HTTPException(status_code=404, detail="To node not registered")
    
    # Create message hash
    message_data = json.dumps(message.dict(), sort_keys=True)
    message_hash = hashlib.sha256(message_data.encode()).hexdigest()
    
    # Create message tracking entry
    message_id = str(uuid.uuid4())
    message_entry = {
        "id": message_id,
        "hash": message_hash,
        "from_node": message.from_node,
        "to_node": message.to_node,
        "message_type": message.message_type,
        "data": message.data,
        "schema": message.schema,
        "status": "processing",
        "created_at": time.time(),
        "steps": []
    }
    
    try:
        # Step 1: Transform data if needed
        transformed_data = message.data
        if route_request.transform_schema and message.schema:
            async with httpx.AsyncClient() as client:
                transform_response = await client.post(
                    f"{TRANSLATOR_URL}/transform",
                    json={
                        "data": message.data,
                        "source_schema": message.schema,
                        "target_schema": route_request.transform_schema
                    }
                )
                if transform_response.status_code == 200:
                    transformed_data = transform_response.json()["transformed_data"]
                    message_entry["steps"].append({
                        "step": "transform",
                        "status": "completed",
                        "timestamp": time.time()
                    })
        
        # Step 2: Sign message with sender's key
        signature = None
        sender_node = registered_nodes[message.from_node]
        if sender_node.get("private_key"):
            async with httpx.AsyncClient() as client:
                sign_response = await client.post(
                    f"{LEDGER_URL}/sign",
                    json={
                        "data": json.dumps(transformed_data, sort_keys=True),
                        "node_id": message.from_node
                    }
                )
                if sign_response.status_code == 200:
                    signature = sign_response.json()["signature"]
                    message_entry["steps"].append({
                        "step": "sign",
                        "status": "completed",
                        "timestamp": time.time()
                    })
        
        # Step 3: Commit to ledger if requested
        ledger_entry_id = None
        if route_request.commit_to_ledger:
            ledger_data = {
                "message_id": message_id,
                "from_node": message.from_node,
                "to_node": message.to_node,
                "message_type": message.message_type,
                "hash": message_hash,
                "transformed_data": transformed_data
            }
            
            async with httpx.AsyncClient() as client:
                ledger_response = await client.post(
                    f"{LEDGER_URL}/ledger/append",
                    json={
                        "data": json.dumps(ledger_data, sort_keys=True),
                        "node_id": message.from_node,
                        "signature": signature
                    }
                )
                if ledger_response.status_code == 200:
                    ledger_entry_id = ledger_response.json()["entry_id"]
                    message_entry["steps"].append({
                        "step": "commit_ledger",
                        "status": "completed",
                        "timestamp": time.time(),
                        "ledger_entry_id": ledger_entry_id
                    })
        
        # Step 4: Log telemetry
        async with httpx.AsyncClient() as client:
            await client.post(
                f"{TRANSLATOR_URL}/telemetry",
                json={
                    "event_type": "message_routed",
                    "node_id": message.from_node,
                    "data": {
                        "message_id": message_id,
                        "to_node": message.to_node,
                        "message_type": message.message_type,
                        "hash": message_hash
                    }
                }
            )
        
        message_entry["status"] = "completed"
        message_entry["transformed_data"] = transformed_data
        message_entry["signature"] = signature
        message_entry["ledger_entry_id"] = ledger_entry_id
        message_entry["completed_at"] = time.time()
        
    except Exception as e:
        message_entry["status"] = "failed"
        message_entry["error"] = str(e)
        message_entry["failed_at"] = time.time()
    
    message_queue.append(message_entry)
    
    return {
        "message_id": message_id,
        "status": message_entry["status"],
        "hash": message_hash,
        "steps": message_entry["steps"],
        "ledger_entry_id": ledger_entry_id
    }

@app.get("/messages")
async def get_messages(limit: int = 100, node_id: Optional[str] = None):
    """Get message history"""
    messages = message_queue
    if node_id:
        messages = [m for m in messages if m["from_node"] == node_id or m["to_node"] == node_id]
    
    return {"messages": messages[-limit:]}

@app.get("/messages/{message_id}")
async def get_message(message_id: str):
    """Get specific message details"""
    for message in message_queue:
        if message["id"] == message_id:
            return message
    raise HTTPException(status_code=404, detail="Message not found")

@app.get("/routing")
async def get_routing_table():
    """Get current routing table"""
    return {"routing_table": routing_table}

@app.get("/status")
async def get_system_status():
    """Get overall system status"""
    # Check service health
    service_status = {}
    
    async with httpx.AsyncClient() as client:
        # Check Translator
        try:
            response = await client.get(f"{TRANSLATOR_URL}/health", timeout=5.0)
            service_status["translator"] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            service_status["translator"] = "unreachable"
        
        # Check Ledger
        try:
            response = await client.get(f"{LEDGER_URL}/health", timeout=5.0)
            service_status["ledger"] = "healthy" if response.status_code == 200 else "unhealthy"
        except:
            service_status["ledger"] = "unreachable"
    
    return {
        "gateway": "healthy",
        "services": service_status,
        "registered_nodes": len(registered_nodes),
        "messages_processed": len(message_queue),
        "uptime": time.time()
    }

@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "total_nodes": len(registered_nodes),
        "total_messages": len(message_queue),
        "successful_messages": sum(1 for m in message_queue if m["status"] == "completed"),
        "failed_messages": sum(1 for m in message_queue if m["status"] == "failed"),
        "routing_capabilities": len(routing_table),
        "uptime": time.time(),
        "service": "gateway"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8080)