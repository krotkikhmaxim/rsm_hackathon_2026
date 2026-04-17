export default function ErrorMessage({ message }: { message: string }) {
  return (
    <div style={{
      padding: '12px 16px',
      background: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: 8,
      color: '#dc2626',
      fontSize: 14,
    }}>
      {message}
    </div>
  );
}
