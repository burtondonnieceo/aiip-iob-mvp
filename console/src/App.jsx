import { useState, useEffect } from 'react'
import axios from 'axios'
import { 
  Server, 
  MessageSquare, 
  Activity, 
  Database, 
  Plus, 
  Send, 
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock
} from 'lucide-react'
import './App.css'

const GATEWAY_URL = 'http://localhost:8080'

function App() {
  const [activeTab, setActiveTab] = useState('nodes')
  const [nodes, setNodes] = useState([])
  const [messages, setMessages] = useState([])
  const [ledgerEntries, setLedgerEntries] = useState([])
  const [systemStatus, setSystemStatus] = useState({})
  const [loading, setLoading] = useState(false)

  // Node registration form
  const [nodeForm, setNodeForm] = useState({
    node_id: '',
    node_type: 'ai',
    capabilities: '',
    endpoint: ''
  })

  // Message form
  const [messageForm, setMessageForm] = useState({
    from_node: '',
    to_node: '',
    message_type: 'data_exchange',
    data: '{}',
    schema: '',
    transform_schema: '',
    commit_to_ledger: true
  })

  // Fetch data functions
  const fetchNodes = async () => {
    try {
      const response = await axios.get(`${GATEWAY_URL}/nodes`)
      setNodes(response.data.nodes)
    } catch (error) {
      console.error('Error fetching nodes:', error)
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${GATEWAY_URL}/messages`)
      setMessages(response.data.messages)
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  const fetchLedgerEntries = async () => {
    try {
      const response = await axios.get('http://localhost:8082/ledger')
      setLedgerEntries(response.data.entries)
    } catch (error) {
      console.error('Error fetching ledger:', error)
    }
  }

  const fetchSystemStatus = async () => {
    try {
      const response = await axios.get(`${GATEWAY_URL}/status`)
      setSystemStatus(response.data)
    } catch (error) {
      console.error('Error fetching system status:', error)
    }
  }

  // Register node
  const registerNode = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const capabilities = nodeForm.capabilities.split(',').map(c => c.trim()).filter(c => c)
      await axios.post(`${GATEWAY_URL}/nodes/register`, {
        ...nodeForm,
        capabilities
      })
      setNodeForm({
        node_id: '',
        node_type: 'ai',
        capabilities: '',
        endpoint: ''
      })
      await fetchNodes()
    } catch (error) {
      console.error('Error registering node:', error)
      alert('Error registering node: ' + (error.response?.data?.detail || error.message))
    }
    setLoading(false)
  }

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      let data
      try {
        data = JSON.parse(messageForm.data)
      } catch {
        data = { text: messageForm.data }
      }

      await axios.post(`${GATEWAY_URL}/messages/send`, {
        message: {
          from_node: messageForm.from_node,
          to_node: messageForm.to_node,
          message_type: messageForm.message_type,
          data,
          schema: messageForm.schema || null
        },
        transform_schema: messageForm.transform_schema || null,
        commit_to_ledger: messageForm.commit_to_ledger
      })
      
      setMessageForm({
        from_node: '',
        to_node: '',
        message_type: 'data_exchange',
        data: '{}',
        schema: '',
        transform_schema: '',
        commit_to_ledger: true
      })
      await fetchMessages()
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Error sending message: ' + (error.response?.data?.detail || error.message))
    }
    setLoading(false)
  }

  // Load data on component mount and tab change
  useEffect(() => {
    fetchSystemStatus()
    if (activeTab === 'nodes') {
      fetchNodes()
    } else if (activeTab === 'messages') {
      fetchMessages()
    } else if (activeTab === 'ledger') {
      fetchLedgerEntries()
    }
  }, [activeTab])

  const renderStatusIcon = (status) => {
    switch (status) {
      case 'healthy':
      case 'active':
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      case 'unhealthy':
      case 'failed':
        return <AlertCircle className="w-4 h-4 text-red-500" />
      case 'processing':
        return <Clock className="w-4 h-4 text-yellow-500" />
      default:
        return <AlertCircle className="w-4 h-4 text-gray-500" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-blue-600 text-white p-4">
        <h1 className="text-2xl font-bold">AIIP-IOB Console</h1>
        <p className="text-blue-100">AI-to-AI Interoperability Protocol - Internet of Blockchains MVP</p>
      </header>

      {/* System Status Bar */}
      <div className="bg-white border-b p-4">
        <div className="flex items-center space-x-6">
          <div className="flex items-center space-x-2">
            <span className="font-medium">Gateway:</span>
            {renderStatusIcon(systemStatus.gateway)}
            <span className="text-sm">{systemStatus.gateway || 'unknown'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">Translator:</span>
            {renderStatusIcon(systemStatus.services?.translator)}
            <span className="text-sm">{systemStatus.services?.translator || 'unknown'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium">Ledger:</span>
            {renderStatusIcon(systemStatus.services?.ledger)}
            <span className="text-sm">{systemStatus.services?.ledger || 'unknown'}</span>
          </div>
          <button
            onClick={fetchSystemStatus}
            className="flex items-center space-x-1 px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <nav className="bg-white border-b">
        <div className="flex space-x-8 px-4">
          {[
            { id: 'nodes', label: 'Nodes', icon: Server },
            { id: 'messages', label: 'Messages', icon: MessageSquare },
            { id: 'ledger', label: 'Ledger', icon: Database },
            { id: 'status', label: 'Status', icon: Activity }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-3 border-b-2 font-medium ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6">
        {/* Nodes Tab */}
        {activeTab === 'nodes' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Plus className="w-5 h-5 mr-2" />
                Register New Node
              </h2>
              <form onSubmit={registerNode} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Node ID</label>
                  <input
                    type="text"
                    value={nodeForm.node_id}
                    onChange={(e) => setNodeForm({...nodeForm, node_id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Node Type</label>
                  <select
                    value={nodeForm.node_type}
                    onChange={(e) => setNodeForm({...nodeForm, node_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ai">AI</option>
                    <option value="blockchain">Blockchain</option>
                    <option value="hybrid">Hybrid</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capabilities (comma-separated)</label>
                  <input
                    type="text"
                    value={nodeForm.capabilities}
                    onChange={(e) => setNodeForm({...nodeForm, capabilities: e.target.value})}
                    placeholder="nlp, image_processing, smart_contracts"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint (optional)</label>
                  <input
                    type="text"
                    value={nodeForm.endpoint}
                    onChange={(e) => setNodeForm({...nodeForm, endpoint: e.target.value})}
                    placeholder="http://localhost:9000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{loading ? 'Registering...' : 'Register Node'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Server className="w-5 h-5 mr-2" />
                Registered Nodes ({nodes.length})
              </h2>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Node ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Capabilities</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Registered</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {nodes.map((node) => (
                      <tr key={node.node_id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{node.node_id}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{node.node_type}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {node.capabilities.join(', ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          <div className="flex items-center space-x-1">
                            {renderStatusIcon(node.status)}
                            <span>{node.status}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(node.registered_at * 1000).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Send className="w-5 h-5 mr-2" />
                Send Message
              </h2>
              <form onSubmit={sendMessage} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">From Node</label>
                  <select
                    value={messageForm.from_node}
                    onChange={(e) => setMessageForm({...messageForm, from_node: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select sender</option>
                    {nodes.map(node => (
                      <option key={node.node_id} value={node.node_id}>{node.node_id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">To Node</label>
                  <select
                    value={messageForm.to_node}
                    onChange={(e) => setMessageForm({...messageForm, to_node: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Select recipient</option>
                    {nodes.map(node => (
                      <option key={node.node_id} value={node.node_id}>{node.node_id}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Type</label>
                  <select
                    value={messageForm.message_type}
                    onChange={(e) => setMessageForm({...messageForm, message_type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="data_exchange">Data Exchange</option>
                    <option value="query">Query</option>
                    <option value="command">Command</option>
                    <option value="response">Response</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schema</label>
                  <input
                    type="text"
                    value={messageForm.schema}
                    onChange={(e) => setMessageForm({...messageForm, schema: e.target.value})}
                    placeholder="source_schema_name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message Data (JSON)</label>
                  <textarea
                    value={messageForm.data}
                    onChange={(e) => setMessageForm({...messageForm, data: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder='{"key": "value"}'
                  />
                </div>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={messageForm.commit_to_ledger}
                      onChange={(e) => setMessageForm({...messageForm, commit_to_ledger: e.target.checked})}
                      className="mr-2"
                    />
                    Commit to Ledger
                  </label>
                </div>
                <div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Send className="w-4 h-4" />
                    <span>{loading ? 'Sending...' : 'Send Message'}</span>
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <MessageSquare className="w-5 h-5 mr-2" />
                Message History ({messages.length})
              </h2>
              <div className="space-y-4">
                {messages.slice().reverse().map((message) => (
                  <div key={message.id} className="border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{message.from_node} → {message.to_node}</span>
                        <span className="text-sm text-gray-500">({message.message_type})</span>
                        {renderStatusIcon(message.status)}
                        <span className="text-sm font-medium">{message.status}</span>
                      </div>
                      <span className="text-sm text-gray-500">
                        {new Date(message.created_at * 1000).toLocaleString()}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      Hash: <code className="bg-gray-100 px-1 rounded">{message.hash}</code>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Original Data:</span>
                        <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                          {JSON.stringify(message.data, null, 2)}
                        </pre>
                      </div>
                      {message.transformed_data && (
                        <div>
                          <span className="font-medium">Transformed Data:</span>
                          <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto">
                            {JSON.stringify(message.transformed_data, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                    {message.steps && message.steps.length > 0 && (
                      <div className="mt-3">
                        <span className="font-medium text-sm">Processing Steps:</span>
                        <div className="flex space-x-4 mt-1">
                          {message.steps.map((step, idx) => (
                            <div key={idx} className="flex items-center space-x-1 text-sm">
                              {renderStatusIcon(step.status)}
                              <span>{step.step}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Ledger Tab */}
        {activeTab === 'ledger' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <Database className="w-5 h-5 mr-2" />
              Ledger Entries ({ledgerEntries.length})
            </h2>
            <div className="space-y-4">
              {ledgerEntries.slice().reverse().map((entry) => (
                <div key={entry.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">Block #{entry.block_height}</span>
                      <span className="text-sm text-gray-500">by {entry.node_id}</span>
                      {renderStatusIcon(entry.verified ? 'completed' : 'failed')}
                      <span className="text-sm font-medium">
                        {entry.verified ? 'Verified' : 'Unverified'}
                      </span>
                    </div>
                    <span className="text-sm text-gray-500">
                      {new Date(entry.timestamp * 1000).toLocaleString()}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Entry ID:</span>
                      <code className="block bg-gray-100 p-1 rounded mt-1 break-all">{entry.id}</code>
                    </div>
                    <div>
                      <span className="font-medium">Data Hash:</span>
                      <code className="block bg-gray-100 p-1 rounded mt-1 break-all">{entry.data_hash}</code>
                    </div>
                  </div>
                  <div className="mt-3">
                    <span className="font-medium">Data:</span>
                    <pre className="bg-gray-50 p-2 rounded mt-1 overflow-x-auto text-xs">
                      {JSON.stringify(JSON.parse(entry.data), null, 2)}
                    </pre>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Status Tab */}
        {activeTab === 'status' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 flex items-center">
                <Activity className="w-5 h-5 mr-2" />
                System Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">{systemStatus.registered_nodes || 0}</div>
                  <div className="text-gray-500">Registered Nodes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">{systemStatus.messages_processed || 0}</div>
                  <div className="text-gray-500">Messages Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{ledgerEntries.length}</div>
                  <div className="text-gray-500">Ledger Entries</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-3 flex items-center">
                  <Server className="w-5 h-5 mr-2" />
                  Gateway Service
                </h3>
                <div className="flex items-center space-x-2 mb-2">
                  {renderStatusIcon(systemStatus.gateway)}
                  <span className="font-medium">{systemStatus.gateway || 'unknown'}</span>
                </div>
                <div className="text-sm text-gray-600">Port: 8080</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-3">Translator Service</h3>
                <div className="flex items-center space-x-2 mb-2">
                  {renderStatusIcon(systemStatus.services?.translator)}
                  <span className="font-medium">{systemStatus.services?.translator || 'unknown'}</span>
                </div>
                <div className="text-sm text-gray-600">Port: 8081</div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold mb-3">Ledger Service</h3>
                <div className="flex items-center space-x-2 mb-2">
                  {renderStatusIcon(systemStatus.services?.ledger)}
                  <span className="font-medium">{systemStatus.services?.ledger || 'unknown'}</span>
                </div>
                <div className="text-sm text-gray-600">Port: 8082</div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
