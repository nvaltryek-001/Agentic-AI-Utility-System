export default function SkeletonLoader({ type = 'text', className = '' }) {
  const types = {
    text: 'h-4 w-full',
    title: 'h-8 w-3/4',
    subtitle: 'h-6 w-1/2',
    image: 'h-48 w-full rounded-xl',
    avatar: 'h-12 w-12 rounded-full',
    card: 'h-32 w-full',
  };

  return (
    <div className={`skeleton rounded-lg ${types[type]} ${className}`} />
  );
}
