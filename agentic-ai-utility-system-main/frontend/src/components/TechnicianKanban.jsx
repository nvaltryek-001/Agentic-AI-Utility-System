import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import GlassCard from './ui/GlassCard';
import { useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

const ItemTypes = {
  TASK: 'task'
};

const DraggableFaultCard = ({ fault, onStatusChange }) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ItemTypes.TASK,
    item: fault,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  return (
    <motion.div
      ref={drag}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: isDragging ? 0.5 : 1, scale: 1 }}
      whileHover={{ scale: 1.02 }}
      className="bg-background-secondary rounded-lg p-4 mb-3 cursor-move shadow-lg border-l-4 border-primary"
    >
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-white font-semibold text-sm">{fault.type} Fault</h4>
        <span className={`text-xs px-2 py-1 rounded ${
          fault.severity === 'critical' ? 'bg-danger/20 text-danger' :
          fault.severity === 'high' ? 'bg-orange-500/20 text-orange-500' :
          fault.severity === 'medium' ? 'bg-warning/20 text-warning' :
          'bg-success/20 text-success'
        }`}>
          {fault.severity}
        </span>
      </div>
      
      <p className="text-gray-400 text-xs mb-3 line-clamp-2">{fault.description}</p>
      
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>ID: {fault._id?.slice(-6).toUpperCase()}</span>
        <span>{new Date(fault.createdAt).toLocaleDateString()}</span>
      </div>
      
      {fault.assignedTo && (
        <div className="mt-3 flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-xs font-bold">
            {fault.assignedTo.name?.charAt(0)}
          </div>
          <span className="text-gray-400 text-xs">{fault.assignedTo.name}</span>
        </div>
      )}
    </motion.div>
  );
};

const KanbanColumn = ({ title, count, status, faults, onDropFault, children }) => {
  const [{ isOver }, drop] = useDrop(() => ({
    accept: ItemTypes.TASK,
    drop: (item) => onDropFault(item, status),
    collect: (monitor) => ({
      isOver: monitor.isOver({ shallow: true })
    })
  }));

  return (
    <div
      ref={drop}
      className={`flex-1 min-w-[280px] rounded-xl p-4 transition-all ${
        isOver ? 'bg-primary/10 ring-2 ring-primary' : 'bg-background-secondary/50'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white flex items-center gap-2">
          {title}
          <span className="bg-background-tertiary text-gray-400 text-xs px-2 py-1 rounded-full">
            {count}
          </span>
        </h3>
      </div>
      
      <div className="space-y-2 max-h-[600px] overflow-y-auto custom-scrollbar">
        {children}
      </div>
    </div>
  );
};

function TechnicianKanban() {
  const [faults, setFaults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFaults();
  }, []);

  const fetchFaults = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/faults?limit=100', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setFaults(data);
      }
    } catch (error) {
      console.error('Failed to fetch faults:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (fault, newStatus) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`/api/faults/${fault._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      setFaults(prev => prev.map(f => 
        f._id === fault._id ? { ...f, status: newStatus } : f
      ));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const getFaultsByStatus = (status) => {
    return faults.filter(f => f.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-400">Loading kanban board...</p>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="h-full">
        {/* Header */}
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="mb-6"
        >
          <h1 className="text-3xl font-bold gradient-text mb-2">Technician Workforce Management</h1>
          <p className="text-gray-400">Drag and drop faults between stages to manage workflow</p>
        </motion.div>

        {/* Kanban Board */}
        <div className="flex gap-4 overflow-x-auto pb-4">
          {/* Reported Column */}
          <KanbanColumn
            title="📋 Reported"
            count={getFaultsByStatus('reported').length}
            status="reported"
            faults={getFaultsByStatus('reported')}
            onDropFault={handleStatusChange}
          >
            {getFaultsByStatus('reported').map(fault => (
              <DraggableFaultCard
                key={fault._id}
                fault={fault}
                onStatusChange={handleStatusChange}
              />
            ))}
          </KanbanColumn>

          {/* Analyzing Column */}
          <KanbanColumn
            title="🔍 Analyzing"
            count={getFaultsByStatus('analyzing').length}
            status="analyzing"
            faults={getFaultsByStatus('analyzing')}
            onDropFault={handleStatusChange}
          >
            {getFaultsByStatus('analyzing').map(fault => (
              <DraggableFaultCard
                key={fault._id}
                fault={fault}
                onStatusChange={handleStatusChange}
              />
            ))}
          </KanbanColumn>

          {/* Assigned Column */}
          <KanbanColumn
            title="✅ Assigned"
            count={getFaultsByStatus('assigned').length + getFaultsByStatus('in_progress').length}
            status="assigned"
            faults={[...getFaultsByStatus('assigned'), ...getFaultsByStatus('in_progress')]}
            onDropFault={handleStatusChange}
          >
            {[...getFaultsByStatus('assigned'), ...getFaultsByStatus('in_progress')].map(fault => (
              <DraggableFaultCard
                key={fault._id}
                fault={fault}
                onStatusChange={handleStatusChange}
              />
            ))}
          </KanbanColumn>

          {/* Completed Column */}
          <KanbanColumn
            title="🎉 Completed"
            count={getFaultsByStatus('completed').length}
            status="completed"
            faults={getFaultsByStatus('completed')}
            onDropFault={handleStatusChange}
          >
            {getFaultsByStatus('completed').map(fault => (
              <DraggableFaultCard
                key={fault._id}
                fault={fault}
                onStatusChange={handleStatusChange}
              />
            ))}
          </KanbanColumn>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          {[
            { label: 'Total Faults', value: faults.length, color: 'from-primary to-secondary' },
            { label: 'In Progress', value: getFaultsByStatus('in_progress').length, color: 'from-warning to-orange-500' },
            { label: 'Completed Today', value: faults.filter(f => 
              f.status === 'completed' && 
              new Date(f.completedAt).toDateString() === new Date().toDateString()
            ).length, color: 'from-success to-green-500' },
            { label: 'Avg Resolution', value: '2.3h', color: 'from-purple to-pink-500' },
          ].map((stat, idx) => (
            <GlassCard key={idx}>
              <div className="text-center">
                <p className="text-gray-400 text-sm mb-2">{stat.label}</p>
                <p className={`text-3xl font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent`}>
                  {stat.value}
                </p>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </DndProvider>
  );
}

export default TechnicianKanban;
