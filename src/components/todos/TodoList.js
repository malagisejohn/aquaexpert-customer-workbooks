import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  X, 
  Trash2, 
  Building, 
  Settings,
  Calendar,
  Repeat,
  Filter
} from 'lucide-react';
import { useTodos } from '../../contexts/TodoContext';

const TodoList = ({ 
  customerId = null, 
  systemId = null,
  showFilters = true,
  showGroupBy = true,
  compact = false,
  maxHeight = 'auto'
}) => {
  const { 
    todos, 
    loading, 
    fetchTodos, 
    updateTodo, 
    deleteTodo,
    bulkUpdateTodos 
  } = useTodos();

  const [filters, setFilters] = useState({
    status: '',
    priority: '',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
  const [groupBy, setGroupBy] = useState('none'); // 'none', 'customer', 'system', 'status'
  const [selectedTodos, setSelectedTodos] = useState([]);
  useEffect(() => {
    const loadTodos = async () => {
      const params = {
        ...filters,
        customerId,
        systemId,
        limit: compact ? 10 : 50
      };
      await fetchTodos(params);
    };
    loadTodos();
  }, [filters, customerId, systemId, compact, fetchTodos]);

  const handleStatusChange = async (todoId, newStatus) => {
    await updateTodo(todoId, { status: newStatus });
  };

  const handleDelete = async (todoId) => {
    if (window.confirm('Are you sure you want to delete this todo?')) {
      await deleteTodo(todoId);
    }
  };

  const handleBulkComplete = async () => {
    if (selectedTodos.length === 0) return;
    await bulkUpdateTodos(selectedTodos, 'completed');
    setSelectedTodos([]);
  };

  const toggleSelection = (todoId) => {
    setSelectedTodos(prev => 
      prev.includes(todoId) 
        ? prev.filter(id => id !== todoId)
        : [...prev, todoId]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'in_progress': return <Clock className="w-5 h-5 text-blue-500" />;
      case 'cancelled': return <X className="w-5 h-5 text-gray-400" />;
      default: return <Circle className="w-5 h-5 text-gray-300" />;
    }
  };

  // Group todos
  const groupedTodos = () => {
    if (groupBy === 'none') return { 'All Todos': todos };
    
    return todos.reduce((acc, todo) => {
      let key;
      switch (groupBy) {
        case 'customer':
          key = todo.customerName || 'No Customer';
          break;
        case 'system':
          key = todo.systemName || 'No System';
          break;
        case 'status':
          key = todo.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
          break;
        default:
          key = 'All Todos';
      }
      if (!acc[key]) acc[key] = [];
      acc[key].push(todo);
      return acc;
    }, {});
  };

  const todosByGroup = groupedTodos();

  if (loading && todos.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className={`${compact ? '' : 'bg-white rounded-lg shadow'}`}>
      {/* Filters */}
      {showFilters && (
        <div className="p-4 border-b border-gray-200 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <select
              value={filters.priority}
              onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">All Priorities</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>

            <select
              value={`${filters.sortBy}-${filters.sortOrder}`}
              onChange={(e) => {
                const [sortBy, sortOrder] = e.target.value.split('-');
                setFilters(prev => ({ ...prev, sortBy, sortOrder }));
              }}
              className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="createdAt-asc">Oldest First</option>
              <option value="dueDate-asc">Due Date (Soonest)</option>
              <option value="priority-desc">Priority (High-Low)</option>
            </select>

            {showGroupBy && (
              <select
                value={groupBy}
                onChange={(e) => setGroupBy(e.target.value)}
                className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="none">No Grouping</option>
                <option value="status">Group by Status</option>
                {!customerId && <option value="customer">Group by Customer</option>}
                {!systemId && <option value="system">Group by System</option>}
              </select>
            )}
          </div>

          {/* Bulk actions */}
          {selectedTodos.length > 0 && (
            <div className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg">
              <span className="text-sm text-blue-700">
                {selectedTodos.length} selected
              </span>
              <button
                onClick={handleBulkComplete}
                className="text-sm px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
              >
                Mark Complete
              </button>
              <button
                onClick={() => setSelectedTodos([])}
                className="text-sm px-3 py-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {/* Todo List */}
      <div 
        className="divide-y divide-gray-200"
        style={{ maxHeight: maxHeight !== 'auto' ? maxHeight : undefined, overflowY: maxHeight !== 'auto' ? 'auto' : undefined }}
      >
        {todos.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No todos found</p>
            <p className="text-sm mt-1">Create your first todo to get started</p>
          </div>
        ) : (
          Object.entries(todosByGroup).map(([groupName, groupTodos]) => (
            <div key={groupName}>
              {groupBy !== 'none' && (
                <div className="px-4 py-2 bg-gray-50 text-sm font-medium text-gray-700 sticky top-0">
                  {groupName} ({groupTodos.length})
                </div>
              )}
              {groupTodos.map(todo => (
                <div
                  key={todo._id}
                  className={`p-4 hover:bg-gray-50 transition-colors ${
                    todo.status === 'completed' ? 'opacity-60' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox for bulk actions */}
                    {!compact && (
                      <input
                        type="checkbox"
                        checked={selectedTodos.includes(todo._id)}
                        onChange={() => toggleSelection(todo._id)}
                        className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                    )}

                    {/* Status icon */}
                    <button
                      onClick={() => handleStatusChange(todo._id, 
                        todo.status === 'completed' ? 'pending' : 'completed'
                      )}
                      className="mt-0.5 flex-shrink-0"
                    >
                      {getStatusIcon(todo.status)}
                    </button>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${
                        todo.status === 'completed' ? 'line-through text-gray-500' : 'text-gray-900'
                      }`}>
                        {todo.content}
                      </p>

                      {/* Metadata */}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${getPriorityColor(todo.priority)}`}>
                          {todo.priority}
                        </span>

                        {todo.dueDate && (
                          <span className={`text-xs flex items-center gap-1 ${
                            new Date(todo.dueDate) < new Date() && todo.status !== 'completed'
                              ? 'text-red-600'
                              : 'text-gray-500'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            {new Date(todo.dueDate).toLocaleDateString()}
                          </span>
                        )}

                        {todo.isRecurring && todo.recurrencePattern && (
                          <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full inline-flex items-center gap-1">
                            <Repeat className="w-3 h-3" />
                            {todo.recurrencePattern}
                          </span>
                        )}

                        {!customerId && todo.customerName && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Building className="w-3 h-3" />
                            {todo.customerName}
                          </span>
                        )}

                        {!systemId && todo.systemName && (
                          <span className="text-xs text-gray-500 flex items-center gap-1">
                            <Settings className="w-3 h-3" />
                            {todo.systemName}
                          </span>
                        )}

                        {todo.aiGenerated && (
                          <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded-full">
                            AI
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    {!compact && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDelete(todo._id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default TodoList;
