import { motion } from 'framer-motion';

export default function StatCard({ 
  icon, 
  title, 
  value, 
  trend, 
  trendValue,
  loading = false 
}) {
  if (loading) {
    return (
      <div className="glass-card p-6">
        <div className="animate-pulse">
          <div className="h-8 w-8 bg-background-tertiary rounded-lg mb-4" />
          <div className="h-4 w-24 bg-background-tertiary rounded mb-2" />
          <div className="h-10 w-16 bg-background-tertiary rounded" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -8, scale: 1.03 }}
      className="stat-card"
    >
      <div className="flex items-start justify-between mb-4">
        <span className="text-3xl">{icon}</span>
        {trend && (
          <span className={`text-sm font-semibold ${
            trend === 'positive' ? 'text-success' : 'text-danger'
          }`}>
            {trendValue}
          </span>
        )}
      </div>
      
      <h3 className="gradient-text text-3xl font-bold mb-2">
        {value}
      </h3>
      
      <p className="text-gray-400 text-sm">{title}</p>
    </motion.div>
  );
}
