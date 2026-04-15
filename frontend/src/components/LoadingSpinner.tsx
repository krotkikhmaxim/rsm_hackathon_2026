export default function LoadingSpinner({ text = 'Загрузка...' }: { text?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 24, color: 'var(--color-text-secondary)' }}>
      <div style={{
        width: 24, height: 24,
        border: '3px solid var(--color-border)',
        borderTopColor: 'var(--color-primary)',
        borderRadius: '50%',
        animation: 'spin 0.8s linear infinite',
      }} />
      <span>{text}</span>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
