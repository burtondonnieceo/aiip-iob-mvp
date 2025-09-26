from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import time
import uuid
import json
import hashlib
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey, Ed25519PublicKey
import base64

app = FastAPI(title="AIIP Ledger Service", version="1.0.0")

# In-memory storage for ledger entries and keys
ledger_entries = []
node_keys = {}

class NodeRegistration(BaseModel):
    node_id: str
    public_key: Optional[str] = None

class LedgerEntry(BaseModel):
    data: str
    node_id: str
    signature: Optional[str] = None

class SignRequest(BaseModel):
    data: str
    node_id: str

@app.get("/")
async def root():
    return {"service": "AIIP Ledger", "status": "active", "port": 8082}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.post("/nodes/register")
async def register_node(registration: NodeRegistration):
    """Register a new node with Ed25519 key pair"""
    # Generate Ed25519 key pair if not provided
    if registration.public_key:
        try:
            public_key_bytes = base64.b64decode(registration.public_key)
            public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
            private_key = None  # Node manages their own private key
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Invalid public key: {str(e)}")
    else:
        private_key = Ed25519PrivateKey.generate()
        public_key = private_key.public_key()
        
        # Store private key for this demo (in production, node would keep this secret)
        private_key_bytes = private_key.private_bytes(
            encoding=serialization.Encoding.Raw,
            format=serialization.PrivateFormat.Raw,
            encryption_algorithm=serialization.NoEncryption()
        )
    
    public_key_bytes = public_key.public_bytes(
        encoding=serialization.Encoding.Raw,
        format=serialization.PublicFormat.Raw
    )
    
    node_keys[registration.node_id] = {
        "public_key": base64.b64encode(public_key_bytes).decode(),
        "private_key": base64.b64encode(private_key_bytes).decode() if not registration.public_key else None,
        "registered_at": time.time()
    }
    
    return {
        "node_id": registration.node_id,
        "public_key": base64.b64encode(public_key_bytes).decode(),
        "private_key": base64.b64encode(private_key_bytes).decode() if not registration.public_key else None,
        "status": "registered"
    }

@app.get("/nodes")
async def get_registered_nodes():
    """Get all registered nodes"""
    nodes = []
    for node_id, key_info in node_keys.items():
        nodes.append({
            "node_id": node_id,
            "public_key": key_info["public_key"],
            "registered_at": key_info["registered_at"]
        })
    return {"nodes": nodes}

@app.post("/sign")
async def sign_data(request: SignRequest):
    """Sign data with node's private key"""
    if request.node_id not in node_keys:
        raise HTTPException(status_code=404, detail="Node not registered")
    
    node_info = node_keys[request.node_id]
    if not node_info.get("private_key"):
        raise HTTPException(status_code=400, detail="Private key not available for this node")
    
    try:
        private_key_bytes = base64.b64decode(node_info["private_key"])
        private_key = Ed25519PrivateKey.from_private_bytes(private_key_bytes)
        
        # Sign the data
        signature = private_key.sign(request.data.encode())
        signature_b64 = base64.b64encode(signature).decode()
        
        return {
            "data": request.data,
            "signature": signature_b64,
            "node_id": request.node_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Signing failed: {str(e)}")

@app.post("/verify")
async def verify_signature(data: str, signature: str, node_id: str):
    """Verify a signature against node's public key"""
    if node_id not in node_keys:
        raise HTTPException(status_code=404, detail="Node not registered")
    
    try:
        public_key_bytes = base64.b64decode(node_keys[node_id]["public_key"])
        public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
        
        signature_bytes = base64.b64decode(signature)
        public_key.verify(signature_bytes, data.encode())
        
        return {"valid": True, "node_id": node_id}
    except Exception:
        return {"valid": False, "node_id": node_id}

@app.post("/ledger/append")
async def append_to_ledger(entry: LedgerEntry):
    """Append an entry to the ledger"""
    # Verify signature if provided
    verified = False
    if entry.signature and entry.node_id in node_keys:
        try:
            public_key_bytes = base64.b64decode(node_keys[entry.node_id]["public_key"])
            public_key = Ed25519PublicKey.from_public_bytes(public_key_bytes)
            signature_bytes = base64.b64decode(entry.signature)
            public_key.verify(signature_bytes, entry.data.encode())
            verified = True
        except Exception:
            verified = False
    
    # Create ledger entry with hash
    entry_id = str(uuid.uuid4())
    data_hash = hashlib.sha256(entry.data.encode()).hexdigest()
    
    ledger_entry = {
        "id": entry_id,
        "data": entry.data,
        "data_hash": data_hash,
        "node_id": entry.node_id,
        "signature": entry.signature,
        "verified": verified,
        "timestamp": time.time(),
        "block_height": len(ledger_entries)
    }
    
    ledger_entries.append(ledger_entry)
    
    return {
        "entry_id": entry_id,
        "block_height": ledger_entry["block_height"],
        "verified": verified,
        "data_hash": data_hash
    }

@app.get("/ledger")
async def get_ledger(limit: int = 100, offset: int = 0):
    """Get ledger entries"""
    total = len(ledger_entries)
    entries = ledger_entries[offset:offset + limit]
    
    return {
        "entries": entries,
        "total": total,
        "limit": limit,
        "offset": offset
    }

@app.get("/ledger/{entry_id}")
async def get_ledger_entry(entry_id: str):
    """Get a specific ledger entry"""
    for entry in ledger_entries:
        if entry["id"] == entry_id:
            return entry
    raise HTTPException(status_code=404, detail="Entry not found")

@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "total_nodes": len(node_keys),
        "total_entries": len(ledger_entries),
        "verified_entries": sum(1 for e in ledger_entries if e["verified"]),
        "uptime": time.time(),
        "service": "ledger"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)