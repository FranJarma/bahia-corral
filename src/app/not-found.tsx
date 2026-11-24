import Link from 'next/link';
export default function NotFound() {
  return (
    <main className="public-container py-24">
      <h1 className="editorial text-4xl">No encontramos esa página</h1>
      <p className="my-6 text-muted">Revisá la dirección o volvé al inicio.</p>
      <Link className="primary-button" href="/">
        Volver al inicio
      </Link>
    </main>
  );
}
