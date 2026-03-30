import React, { useState } from 'react';
import { Plus, CheckSquare } from 'lucide-react';
import TodoList from '../components/todos/TodoList';
import TodoModal from '../components/todos/TodoModal';
import { useTodos } from '../contexts/TodoContext';

const Todos = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { stats } = useTodos();

  const statCards = [
    { label: 'Pending', value: stats.pending, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'In Progress', value: stats.in_progress, color: 'bg-blue-100 text-blue-800' },
    { label: 'Completed', value: stats.completed, color: 'bg-green-100 text-green-800' },
    { label: 'Total', value: stats.total, color: 'bg-gray-100 text-gray-800' }
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-xl">
            <CheckSquare className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Todos</h1>
            <p className="text-gray-500">Manage your tasks and action items</p>
          </div>
        </div>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Todo
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className={`p-4 rounded-xl ${stat.color}`}>
            <p className="text-2xl font-bold">{stat.value}</p>
            <p className="text-sm opacity-80">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Todo List */}
      <TodoList 
        showFilters={true}
        showGroupBy={true}
        compact={false}
        maxHeight="600px"
      />

      {/* Modal */}
      <TodoModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        source="navbar"
      />
    </div>
  );
};

export default Todos;
