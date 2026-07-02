# ADR-0062 — Ciclo canônico de pós-render mobile

Status: Proposto

A aplicação mobile deve executar aprimoradores DOM registrados após cada render canônico que substitua o HTML da ficha. O registro deve preservar ordem, permitir remoção idempotente e receber o contexto atual de root, personagem, sessão e modo.

Módulos não devem inferir rerenders por listas de ações, timers, microtasks ou observers. Ataques será migrado somente após a integração deste ciclo.
