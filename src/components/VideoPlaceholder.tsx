interface VideoPlaceholderProps {
  title?: string;
  description?: string;
}

export default function VideoPlaceholder({
  title = "Видео",
  description = "Видео будет создано в Manim"
}: VideoPlaceholderProps) {
  return (
    <div style={{
      backgroundColor: '#e0e0e0',
      borderRadius: '10px',
      padding: '3rem',
      textAlign: 'center',
      maxWidth: '800px',
      margin: '2rem auto'
    }}>
      <div style={{
        fontSize: '4rem',
        marginBottom: '1rem',
        opacity: 0.3
      }}>
        ▶
      </div>
      <h3 style={{
        color: '#666',
        marginBottom: '0.5rem',
        fontSize: '1.5rem'
      }}>
        {title}
      </h3>
      <p style={{
        color: '#999',
        fontSize: '1rem'
      }}>
        {description}
      </p>
    </div>
  );
}
