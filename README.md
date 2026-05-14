stars Engine

motor de creación híbrido diseñado para la convergencia de arte 2D artesanal y sistemas lógicos 3D. stars engine proporciona la infraestructura técnica necesaria para desarrollar títulos con mundos sistémicos y una dirección artística de alta fidelidad, moviendo el desarrollo web más allá de los motores de juego convencionales.

🏗 Arquitectura del Motor

Gestión de Estado y Persistencia

    Systemic Store: Implementado con Zustand, centralizando la lógica de entidades, capas artísticas y variables globales para una reactividad de baja latencia.

    Persistence Layer: Gestión de datos mediante IndexedDB (idb-keyval), permitiendo el manejo de escenas pesadas y estados de mundo persistentes sin degradación de rendimiento.

Viewport y Renderizado

    3D Core: Basado en Three.js y React Three Fiber, integrando un motor de renderizado espacial que gestiona profundidad y transformaciones en tiempo real.

    Artist Canvas: Sistema de dibujo y animación por fotogramas con soporte nativo para capas, cebolla (onion skin) y modos de mezcla de color.

🎯 Objetivos de Producción (Roadmap)

Para alcanzar estándares de calidad de juegos sistémicos de alta factura, el desarrollo se centra en:

    Hibridación de Cámara: Implementación de un sistema de cámaras que permita alternar dinámicamente entre perspectiva atmosférica y proyección ortográfica. Esto es fundamental para permitir que el artista trabaje con precisión técnica de layout antes de pasar a la composición final.

    Lógica de Entidades Profunda: Evolución de los scripts de componente para soportar ciclos de vida completos (onStart, onUpdate, onDestroy), permitiendo mecánicas de juego complejas (IA, ecosistemas, inventarios).

    Optimización Sistémica: Aprovechamiento del React Compiler y Vite 8 para mantener una tasa de frames estable en entornos con alta densidad de activos y scripts activos.

🛠 Entornos de Trabajo (Workspaces)

    Artist Workspace: Enfoque en la estética y animación. Control de línea de tiempo y jerarquía de capas artísticas.

    Dev Workspace: Enfoque en la estructura y comportamiento. Manipulación de entidades 3D y edición de scripts de lógica mediante el componente integrado de Monaco Editor.

⚙ Stack Técnico

    Core: React 19, Vite 8, Babel (React Compiler).

    Gráficos: Three.js, React Three Fiber, R3F Drei.

    Estado: Zustand.

    Scripting: Monaco Editor (Componente de edición).

    Animación UI: Framer Motion.