# AIIP-IOB-MVP

This repository contains the Minimum Viable Product (MVP) implementation of the **AI-to-AI Interoperability Protocol (AIIP)** for the **Internet of Blockchains (IOB)**. The MVP demonstrates core functionality of the ecosystem by connecting multiple AI agents, enabling message translation, notarization, and governance checks across blockchain-inspired components.

## Overview

The MVP includes four main services:

- **Translator (FastAPI, port 8081)**  
  Handles schema translation between systems (e.g., SysA → SysB). Includes telemetry for speculative decoding acceleration.

- **Ledger (FastAPI, port 8082)**  
  Demonstrates notarization with Ed25519 demo signatures. Stores message digests, validator sets, and optional speculative fields.

- **Gateway (FastAPI, port 8080)**  
  Orchestrates flows between nodes, translator, and ledger. Performs SHA-256 digesting and submits commits to the ledger.

- **Console (React + Vite, port 5173)**  
  A simple frontend for registering nodes, sending demo messages, checking status, and browsing ledger entries.

## Goals

This MVP showcases how AIIP can serve as the **Internet of Intelligence**, bridging AI systems and blockchains. It is designed for:

- Demonstrating **cross-system message interoperability**  
- Validating **Proof of Harmony & Governance (PoHG)** concepts  
- Logging **telemetry and speculative decoding metrics**  
- Laying the foundation for scalable multi-agent, multi-chain ecosystems  

## Getting Started

1. Clone the repository:  
   ```bash
   git clone https://github.com/YourUser/aiip-iob-mvp.git
   cd aiip-iob-mvp

