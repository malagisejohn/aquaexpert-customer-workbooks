import React, { createContext, useContext, useState, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const TodoContext = createContext();

export const useTodos = () => {
  const context = useContext(TodoContext);
  if (!context) {
    throw new Error('useTodos must be used within a TodoProvider');
  }
  return context;
};

export const TodoProvider = ({ children }) => {
  const [todos, setTodos] = useState([]);
  const [stats, setStats] = useState({
    pending: 0,
    in_progress: 0,
    completed: 0,
    cancelled: 0,
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Fetch todos with filters
  const fetchTodos = useCallback(async (filters = {}) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/todos?${params.toString()}`);
      setTodos(response.data.todos);
      setPagination(response.data.pagination);
      return response.data;
    } catch (error) {
      console.error('Error fetching todos:', error);
      toast.error('Failed to load todos');
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch todo stats
  const fetchStats = useCallback(async (filters = {}) => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params.append(key, value);
        }
      });

      const response = await axios.get(`/api/todos/stats?${params.toString()}`);
      setStats(response.data);
      return response.data;
    } catch (error) {
      console.error('Error fetching todo stats:', error);
      throw error;
    }
  }, []);

  // Create a new todo manually
  const createTodo = useCallback(async (todoData) => {
    try {
      const response = await axios.post('/api/todos', todoData);
      setTodos(prev => [response.data, ...prev]);
      toast.success('Todo created successfully');
      return response.data;
    } catch (error) {
      console.error('Error creating todo:', error);
      toast.error(error.response?.data?.error || 'Failed to create todo');
      throw error;
    }
  }, []);

  // Create todo with AI assistance
  const createTodoWithAI = useCallback(async (message, context = {}) => {
    try {
      const response = await axios.post('/api/todos/ai-create', {
        message,
        ...context
      });
      const createdTodos = response.data.todos || (response.data.todo ? [response.data.todo] : []);
      if (createdTodos.length > 0) {
        setTodos(prev => [...createdTodos, ...prev]);
      }
      toast.success(`${createdTodos.length || 1} todo${(createdTodos.length || 1) === 1 ? '' : 's'} created with AI`);
      return response.data;
    } catch (error) {
      console.error('Error creating AI todo:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create todo';
      toast.error(errorMsg);
      throw error;
    }
  }, []);

  // Create multiple todos from one AI message
  const createTodosWithAI = useCallback(async (message, context = {}) => {
    try {
      const response = await axios.post('/api/todos/ai-create-bulk', {
        message,
        ...context
      });
      const createdTodos = response.data.todos || [];
      setTodos(prev => [...createdTodos, ...prev]);
      toast.success(`${createdTodos.length} todo${createdTodos.length === 1 ? '' : 's'} created with AI`);

      const createdCustomers = response.data.createdCustomers || [];
      if (createdCustomers.length > 0) {
        toast.success(`${createdCustomers.length} customer${createdCustomers.length === 1 ? '' : 's'} added automatically`);
      }

      const warnings = response.data.warnings || [];
      warnings.forEach((warning) => toast(warning, { icon: '!' }));

      return response.data;
    } catch (error) {
      console.error('Error creating AI todos in bulk:', error);
      const errorMsg = error.response?.data?.error || 'Failed to create todos';
      toast.error(errorMsg);
      throw error;
    }
  }, []);

  // Update a todo
  const updateTodo = useCallback(async (id, updates) => {
    try {
      const response = await axios.put(`/api/todos/${id}`, updates);
      setTodos(prev => prev.map(todo => 
        todo._id === id ? response.data : todo
      ));
      
      if (updates.status === 'completed') {
        toast.success('Todo completed!');
      }
      return response.data;
    } catch (error) {
      console.error('Error updating todo:', error);
      toast.error('Failed to update todo');
      throw error;
    }
  }, []);

  // Delete a todo
  const deleteTodo = useCallback(async (id) => {
    try {
      await axios.delete(`/api/todos/${id}`);
      setTodos(prev => prev.filter(todo => todo._id !== id));
      toast.success('Todo deleted');
    } catch (error) {
      console.error('Error deleting todo:', error);
      toast.error('Failed to delete todo');
      throw error;
    }
  }, []);

  // Bulk update todos
  const bulkUpdateTodos = useCallback(async (ids, status) => {
    try {
      const response = await axios.post('/api/todos/bulk-update', { ids, status });
      setTodos(prev => prev.map(todo => 
        ids.includes(todo._id) ? { ...todo, status } : todo
      ));
      toast.success(`${response.data.modifiedCount} todos updated`);
      return response.data;
    } catch (error) {
      console.error('Error bulk updating todos:', error);
      toast.error('Failed to update todos');
      throw error;
    }
  }, []);

  // Get pending count for badge
  const getPendingCount = useCallback(async () => {
    try {
      const response = await axios.get('/api/todos/stats');
      return response.data.pending + response.data.in_progress;
    } catch (error) {
      console.error('Error fetching pending count:', error);
      return 0;
    }
  }, []);

  const value = {
    todos,
    stats,
    loading,
    pagination,
    fetchTodos,
    fetchStats,
    createTodo,
    createTodoWithAI,
    createTodosWithAI,
    updateTodo,
    deleteTodo,
    bulkUpdateTodos,
    getPendingCount
  };

  return (
    <TodoContext.Provider value={value}>
      {children}
    </TodoContext.Provider>
  );
};
