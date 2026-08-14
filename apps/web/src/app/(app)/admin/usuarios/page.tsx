'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

/**
 * `/admin/usuarios` (rota antiga da "Equipe") — mantida viva por
 * compatibilidade de link/bookmark, mas o produto agora vive em
 * `/colaboradores` (Sprint "Colaboradores"). Reafirma
 * docs/frontend/06-autorizacao.md §6.5 — a rota nunca 404; aqui ela só
 * redireciona, a checagem de permissão real acontece em `/colaboradores`.
 */
export default function UsuariosPage() {
  const router = useRouter();

  React.useEffect(() => {
    router.replace('/colaboradores');
  }, [router]);

  return null;
}
