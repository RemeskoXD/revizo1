'use client';
 
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body>
        <h2>Něco se pokazilo!</h2>
        <button onClick={() => reset()}>Zkusit znovu</button>
      </body>
    </html>
  )
}
