from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Dict, Any, List
import time
import uuid
import json

app = FastAPI(title="AIIP Translator Service", version="1.0.0")

# In-memory storage for telemetry and schema mappings
telemetry_data = []
schema_mappings = {}

class SchemaMapping(BaseModel):
    source_schema: str
    target_schema: str
    mapping_rules: Dict[str, Any]

class TelemetryEvent(BaseModel):
    event_type: str
    node_id: str
    data: Dict[str, Any]

class TransformRequest(BaseModel):
    data: Dict[str, Any]
    source_schema: str
    target_schema: str

@app.get("/")
async def root():
    return {"service": "AIIP Translator", "status": "active", "port": 8081}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": time.time()}

@app.post("/schema/register")
async def register_schema_mapping(mapping: SchemaMapping):
    """Register a new schema mapping for data transformation"""
    mapping_id = str(uuid.uuid4())
    schema_mappings[mapping_id] = {
        "id": mapping_id,
        "source_schema": mapping.source_schema,
        "target_schema": mapping.target_schema,
        "mapping_rules": mapping.mapping_rules,
        "created_at": time.time()
    }
    
    # Log telemetry
    telemetry_data.append({
        "event_type": "schema_registered",
        "timestamp": time.time(),
        "mapping_id": mapping_id,
        "source_schema": mapping.source_schema,
        "target_schema": mapping.target_schema
    })
    
    return {"mapping_id": mapping_id, "status": "registered"}

@app.get("/schema/mappings")
async def get_schema_mappings():
    """Get all registered schema mappings"""
    return {"mappings": list(schema_mappings.values())}

@app.post("/transform")
async def transform_data(request: TransformRequest):
    """Transform data from source schema to target schema"""
    # Find the appropriate mapping
    mapping = None
    for m in schema_mappings.values():
        if m["source_schema"] == request.source_schema and m["target_schema"] == request.target_schema:
            mapping = m
            break
    
    if not mapping:
        raise HTTPException(status_code=404, detail="Schema mapping not found")
    
    # Simple transformation based on mapping rules
    transformed_data = {}
    for target_field, source_field in mapping["mapping_rules"].items():
        if source_field in request.data:
            transformed_data[target_field] = request.data[source_field]
    
    # Log telemetry
    telemetry_data.append({
        "event_type": "data_transformed",
        "timestamp": time.time(),
        "mapping_id": mapping["id"],
        "source_schema": request.source_schema,
        "target_schema": request.target_schema,
        "data_size": len(json.dumps(request.data))
    })
    
    return {"transformed_data": transformed_data, "mapping_id": mapping["id"]}

@app.post("/telemetry")
async def log_telemetry(event: TelemetryEvent):
    """Log telemetry events"""
    telemetry_entry = {
        "id": str(uuid.uuid4()),
        "event_type": event.event_type,
        "node_id": event.node_id,
        "data": event.data,
        "timestamp": time.time()
    }
    telemetry_data.append(telemetry_entry)
    return {"status": "logged", "event_id": telemetry_entry["id"]}

@app.get("/telemetry")
async def get_telemetry(limit: int = 100):
    """Get recent telemetry data"""
    return {"telemetry": telemetry_data[-limit:]}

@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "total_schemas": len(schema_mappings),
        "total_telemetry_events": len(telemetry_data),
        "uptime": time.time(),
        "service": "translator"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8081)