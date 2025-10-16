import { redirect } from 'next/navigation';

export default function HomePage() {
    // Root przekierowuje na stronę logowania
    redirect('/login');
}
