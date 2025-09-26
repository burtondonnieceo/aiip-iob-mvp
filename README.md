# AIIP-IOB MVP

aiip-iob-mvp is the Minimum Viable Product for the AI-to-AI Interoperability Protocol (AIIP) within the Internet of Blockchains (IOB) ecosystem. It demonstrates core services—Translator, Gateway, Ledger, and Console—showing how AI and blockchains can securely interoperate.

## Architecture

The AIIP-IOB MVP consists of four main components:

### Backend Services (FastAPI)

1. **Gateway Service** (Port 8080)
   - Main entry point for the system
   - Routes messages between nodes
   - Handles node registration
   - Coordinates with other services
   - Provides CORS support for frontend

2. **Translator Service** (Port 8081)
   - Schema mapping and data transformation
   - Telemetry collection and reporting
   - Supports multiple schema formats
   - Tracks transformation metrics

3. **Ledger Service** (Port 8082)
   - Ed25519 cryptographic signatures
   - Immutable ledger storage
   - Node key management
   - Signature verification

### Frontend

4. **Console Application** (Port 5173)
   - React + Vite web application
   - Node registration interface
   - Message sending and tracking
   - Ledger browsing
   - System status monitoring

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- npm

### Setup and Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd aiip-iob-mvp
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **Install Node.js dependencies:**
   ```bash
   cd console
   npm install
   cd ..
   ```

### Running the System

#### Option 1: Using VS Code Tasks (Recommended)

If using VS Code, use the predefined tasks:
- `Ctrl+Shift+P` → "Tasks: Run Task"
- Select "Setup AIIP Project" to install all dependencies
- Select "Start Full AIIP Stack" to run all services

#### Option 2: Manual Startup

**Start Backend Services:**

Terminal 1 - Translator Service:
```bash
cd backend/translator
python main.py
```

Terminal 2 - Ledger Service:
```bash
cd backend/ledger
python main.py
```

Terminal 3 - Gateway Service:
```bash
cd backend/gateway
python main.py
```

**Start Frontend:**

Terminal 4 - Console:
```bash
cd console
npm run dev
```

### Access Points

- **Console UI**: http://localhost:5173
- **Gateway API**: http://localhost:8080
- **Translator API**: http://localhost:8081
- **Ledger API**: http://localhost:8082

## Usage Guide

### 1. Register Nodes

1. Open the Console at http://localhost:5173
2. Go to the "Nodes" tab
3. Fill in the node registration form:
   - **Node ID**: Unique identifier (e.g., "ai-node-1")
   - **Node Type**: Select AI, Blockchain, or Hybrid
   - **Capabilities**: Comma-separated list (e.g., "nlp, image_processing")
   - **Endpoint**: Optional external endpoint

### 2. Send Messages

1. Switch to the "Messages" tab
2. Fill in the message form:
   - **From Node**: Select sender from registered nodes
   - **To Node**: Select recipient from registered nodes
   - **Message Type**: Choose message type
   - **Message Data**: JSON data to send
   - **Schema**: Optional source schema name
   - **Commit to Ledger**: Check to store in ledger

### 3. View Ledger

1. Go to the "Ledger" tab
2. Browse all ledger entries
3. See verification status, signatures, and data hashes
4. View block heights and timestamps

### 4. Monitor System

1. Check the "Status" tab for system overview
2. Monitor service health in the top status bar
3. View metrics and statistics

## API Documentation

### Gateway Service (Port 8080)

- `POST /nodes/register` - Register a new node
- `GET /nodes` - List registered nodes
- `POST /messages/send` - Send a message between nodes
- `GET /messages` - Get message history
- `GET /status` - Get system status

### Translator Service (Port 8081)

- `POST /schema/register` - Register schema mapping
- `POST /transform` - Transform data between schemas
- `POST /telemetry` - Log telemetry events
- `GET /telemetry` - Get telemetry data

### Ledger Service (Port 8082)

- `POST /nodes/register` - Register node with Ed25519 keys
- `POST /sign` - Sign data with node's private key
- `POST /verify` - Verify signature
- `POST /ledger/append` - Add entry to ledger
- `GET /ledger` - Get ledger entries

## Development

### Project Structure

```
aiip-iob-mvp/
├── backend/
│   ├── requirements.txt
│   ├── translator/
│   │   └── main.py
│   ├── ledger/
│   │   └── main.py
│   └── gateway/
│       └── main.py
├── console/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── App.css
│   │   └── main.jsx
│   ├── package.json
│   └── vite.config.js
├── .vscode/
│   └── tasks.json
└── README.md
```

### Key Features

- **Ed25519 Signatures**: Cryptographic signing and verification
- **Schema Translation**: Flexible data transformation
- **Message Routing**: Intelligent message delivery
- **Ledger Storage**: Immutable transaction history
- **Real-time UI**: Live system monitoring
- **CORS Support**: Frontend-backend integration

### Technology Stack

**Backend:**
- FastAPI - Modern Python web framework
- Uvicorn - ASGI server
- Cryptography - Ed25519 implementation
- Pydantic - Data validation
- HTTPX - Async HTTP client

**Frontend:**
- React 18 - User interface library
- Vite - Build tool and dev server
- Tailwind CSS - Utility-first CSS
- Lucide React - Icon library
- Axios - HTTP client

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the AI-to-AI Interoperability Protocol (AIIP) initiative within the Internet of Blockchains ecosystem.

## Support

For questions or issues, please check the documentation or submit an issue in the repository.
