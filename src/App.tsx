import { useWorkflowStore } from './stores/workflowStore';
import { Layout } from './components/Layout';
import { ApiKeyModal } from './components/ApiKeyModal';

function App() {
  const phase = useWorkflowStore(s => s.phase);

  if (phase === 'setup') {
    return <ApiKeyModal />;
  }

  return <Layout />;
}

export default App;
