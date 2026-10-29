# RETO HACKATON

Existe una pagina web con cursos disponibles

## QUE SE QUIERE HACER

Un boto de IA de Telegram con un agente que pueda hacer hablar acerca de los cursos y dar informacion de los cursos

## QUE ENTREGAR

- EL bot de Telegram
- El dashboard que se ve en la cosa
- EL link de Github


## DOCUMENTACION TECNICA

UNIVERSIDAD TÉCNICA DE AMBATO 

Facultad de Ingeniería en Sistemas, Electrónica e Industrial (FISEI)[Text Wrapping Break]Documento Técnico & Rúbrica Oficial de Evaluación — Edición Especial Ambato Meetup 

 

Reto Oficial Hackathon 2026 

Ecosistema Multi-Agente para Ventas y Gestión Conversacional 

Bases técnicas, especificaciones de arquitectura y rúbrica integral de calificación para el equipo evaluador de la Facultad de Ingeniería en Sistemas, Electrónica e Industrial. 

    Fecha y hora: 29 de Octubre • 08:00 

    Sede: Auditorio 1 Fac. Adm. 

    Ejes temáticos: Innovación • Redes • Tech 

    Ecosistema aliado: SpaceX • GDG Quito • Supabase 

 

SECCIÓN 01: Contexto del Reto y Objetivos 

1. Justificación del Problema 

Un centro de capacitación tecnológica enfrenta un desafío sustancial en su proceso de captación y soporte: los prospectos solicitan información en horarios heterogéneos (madrugadas, fines de semana y feriados). La respuesta tardía o la implementación de bots rígidos basados en menús reducen la tasa de conversión y generan fricción cognitiva. 

Objetivo: Desarrollar un modelo híbrido autónomo–humano que responda y persuada con naturalidad conversacional, respaldado por un panel de mando reactivo que faculte la intervención de un operador humano en tiempo real. 

 

2. Componentes Fundamentales a Desarrollar 

Módulo A: Canal Conversacional — Agente de Atención (Telegram) 

    Agente impulsado por LLM. 

    Debe perfilar prospectos, resolver requerimientos técnicos del pénsum de cursos, argumentar ante objeciones comerciales y canalizar la inscripción con tono empático y no robótico. 

Módulo B: Supervisión y Handover — Panel de Mando (Dashboard Web) 

    Interfaz web en tiempo real que liste las interacciones activas concurrentes. 

    Permite al operador administrativo auditar métricas e intervenir inmediatamente en el hilo sin romper la experiencia del usuario. 

 

3. Requisitos Críticos y Casos de Borde 

    01. Transición Transparente (Seamless Handover):[Text Wrapping Break]Al detectar frustración del cliente o recibir intervención directa del operador, la IA debe pausar su inferencia automáticamente. Los mensajes enviados por el administrador fluyen por Telegram bajo la misma identidad del bot. 

    02. Termómetro de Interacción en Tiempo Real:[Text Wrapping Break]Clasificación semántica del estado del prospecto (interesado, dudoso, frustrado o lead caliente) visible instantáneamente en las tarjetas de chat mediante indicadores sutiles de estado. 

    03. Resiliencia y Barreras de Seguridad (Prompt Injection):[Text Wrapping Break]Defensa sólida contra intentos maliciosos de ingeniería de prompts orientados a obtener cursos gratuitos, forzar descuentos no autorizados o alterar las directrices del centro educativo. 

 

4. Entregables Obligatorios para Evaluación 

    Entregable 1 — Bot de Telegram en vivo: Desplegado y accesible para pruebas interactivas por parte del jurado. 

    Entregable 2 — URL del Dashboard Web: Plataforma web funcional, reactiva y accesible sin restricciones de CORS. 

    Entregable 3 — Repositorio y Documentación: Código fuente limpio, configuración de variables de entorno y guía de despliegue. 

 

SECCIÓN 02: Rúbrica de Evaluación Académica y Técnica 

Puntaje Total: 100 puntos 

Criterio de Evaluación 
	

Descripción Detallada 
	

Puntaje 

A. Comportamiento y Lógica del Agente Conversacional 
	

 
	

30 pts 

• Capacidad de persuasión y tono humano 
	

Adaptabilidad lingüística natural; evita respuestas estructuradas como catálogo y promueve el valor académico del pénsum. 
	

10 pts 

• Identificación de intención y derivación oportuna 
	

Discierne cuándo cerrar la inscripción o transferir de forma oportuna la consulta hacia un docente o asesor humano. 
	

10 pts 

• Resiliencia ante casos de borde e inyecciones 
	

Tolerancia a faltas ortográficas, giros temáticos inesperados y defensas frente a jailbreaks o solicitudes de descuento indebidas. 
	

10 pts 

B. Panel de Control Web e Intervención Humana 
	

 
	

30 pts 

• Sincronización bidireccional en tiempo real 
	

Actualización inmediata vía WebSockets o Server-Sent Events sin recarga manual de pantalla. 
	

10 pts 

• Mecanismo de handover y pausa de IA 
	

Facilidad para congelar la inferencia al intervenir un operador y reanudar el flujo de forma clara y sin fricción. 
	

10 pts 

• Diseño UI/UX y visibilidad del estado de chat 
	

Claridad visual, termómetro de intención y ergonomía para gestionar múltiples conversaciones concurrentes. 
	

10 pts 

C. Arquitectura, Integración y Eficiencia Técnica 
	

 
	

20 pts 

• Diseño modular y separación de capas 
	

Estructura limpia entre conectores de mensajería, pipeline de inferencia y persistencia de datos. 
	

10 pts 

• Gestión de tokens y ventana de contexto 
	

Prompt estructurado y gestión de historial concisa para optimizar latencia y consumo de recursos. 
	

10 pts 

D. Innovación, Valor Agregado y Sustentación 
	

 
	

20 pts 

• Funcionalidades complementarias de valor 
	

Transcripción de audio, resúmenes automáticos para el operador o métricas analíticas destacadas. 
	

10 pts 

• Sustentación técnica y demostración en vivo 
	

Claridad en la resolución de preguntas del jurado y estabilidad durante las pruebas de interacción en vivo. 
	

10 pts 

 

Validación del Comité Evaluador 

Jurado Evaluador 1 
	

Jurado Evaluador 2 
	

Delegado de Industria 

__________________________ 
	

__________________________ 
	

__________________________ 

Docente FISEI - UTA 
	

Docente FISEI - UTA 
	

GDG Quito / Comité Organizador 

 

Universidad Técnica de Ambato • Facultad de Ingeniería en Sistemas, Electrónica e Industrial (FISEI) • Ambato, Ecuador 

 