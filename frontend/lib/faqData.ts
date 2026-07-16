export interface FAQ {
  id: string;
  question: string;
  answer: string;
}

export const faqData: FAQ[] = [
  {
    id: '1',
    question: '¿Cuál es el horario de atención para solicitudes administrativas?',
    answer: 'El horario de atención es de Lunes a Viernes de 8:00 AM a 5:00 PM. Las solicitudes enviadas fuera de este horario serán procesadas el siguiente día hábil.'
  },
  {
    id: '2',
    question: '¿Cómo puedo restablecer mi contraseña?',
    answer: 'Para restablecer tu contraseña, debes contactar al administrador del sistema de tu dependencia. Si eres el administrador, comunícate con el soporte de TI central.'
  },
  {
    id: '3',
    question: '¿Cómo contacto a soporte técnico?',
    answer: 'Puedes contactar a soporte a través del módulo de "Solicitudes" seleccionando la categoría de soporte, o enviando un correo al área de TI.'
  },
  {
    id: '4',
    question: '¿Dónde puedo ver el estado de mi solicitud?',
    answer: 'Puedes revisar el estado de todas tus solicitudes en la sección "Mis Solicitudes" del menú principal.'
  }
];
