'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

/** En la home basta `#…`; en otras rutas hay que ir a `/#…` para que exista el id en el documento. */
export function NavComoFuncionaLink() {
  const pathname = usePathname();
  if (pathname === '/') {
    return <a href="#como-funciona">Cómo funciona</a>;
  }
  return <Link href="/#como-funciona">Cómo funciona</Link>;
}
