import { WorkingTerminal } from './components/WorkingTerminal'
import './styles/app.css'

export default function TestApp() {
  return (
    <div className="h-screen bg-gray-900 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h1 className="text-2xl font-bold text-white">Working Terminal Test</h1>
        <p className="text-gray-400">
          Real terminal connected to your shell via node-pty
        </p>
      </div>
      <div className="flex-1 p-4">
        <div className="h-full bg-black rounded-lg overflow-hidden">
          <WorkingTerminal id="test-terminal" />
        </div>
      </div>
    </div>
  )
}