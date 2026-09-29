import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404</p>
      <h1>That page is not part of the system.</h1>
      <p>The address may be old, incomplete, or no longer in use.</p>
      <Link className="button button-primary" href="/">
        Return home
      </Link>
    </main>
  );
}
