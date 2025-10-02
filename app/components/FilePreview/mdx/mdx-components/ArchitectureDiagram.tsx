interface ArchitectureDiagramProps {
  title?: string;
  nodes: Array<{
    id: string;
    label: string;
    type?: 'service' | 'database' | 'api' | 'frontend';
  }>;
  connections?: Array<{
    from: string;
    to: string;
    label?: string;
  }>;
}

export function ArchitectureDiagram({ title, nodes, connections = [] }: ArchitectureDiagramProps) {
  const nodeTypeStyles = {
    service: 'bg-blue-100 dark:bg-blue-900 border-blue-500 text-blue-800 dark:text-blue-200',
    database: 'bg-green-100 dark:bg-green-900 border-green-500 text-green-800 dark:text-green-200',
    api: 'bg-purple-100 dark:bg-purple-900 border-purple-500 text-purple-800 dark:text-purple-200',
    frontend: 'bg-orange-100 dark:bg-orange-900 border-orange-500 text-orange-800 dark:text-orange-200'
  };

  return (
    <div className="my-6 p-6 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {nodes.map((node) => (
          <div
            key={node.id}
            className={`p-4 rounded-lg border-2 text-center ${nodeTypeStyles[node.type || 'service']}`}
          >
            <div className="font-medium">{node.label}</div>
            <div className="text-xs mt-1 opacity-75">{node.type || 'service'}</div>
          </div>
        ))}
      </div>

      {connections.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
          <h4 className="text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Connections:</h4>
          <ul className="text-sm space-y-1">
            {connections.map((conn, index) => (
              <li key={index} className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <span>{conn.from}</span>
                <span>→</span>
                <span>{conn.to}</span>
                {conn.label && <span className="text-xs">({conn.label})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}