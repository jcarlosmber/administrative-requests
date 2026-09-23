const nodemailer = require('nodemailer');
require('dotenv').config();

// Configurar el transporte SMTP Relay (o simulación en desarrollo local si no hay variables)
let transporter;

if (process.env.SMTP_HOST) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '25', 10),
    secure: process.env.SMTP_SECURE === 'true',
    tls: {
      rejectUnauthorized: false
    }
  });
} else {
  // Modo simulación local para desarrollo si no hay SMTP configurado
  transporter = {
    sendMail: async (options) => {
      console.log('\n==================================================');
      console.log('📬 [SIMULACIÓN DE NOTIFICACIÓN POR CORREO]');
      console.log(`De:      ${options.from}`);
      console.log(`Para:    ${options.to}`);
      console.log(`Asunto:  ${options.subject}`);
      console.log('------------------------- CONTENIDO -------------------------');
      // Remover tags HTML simples para mostrar texto plano en consola
      const plainText = options.html ? options.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() : '';
      console.log(plainText.substring(0, 300) + '...');
      console.log('==================================================\n');
      return { messageId: 'simulated-message-id' };
    }
  };
}

const FROM_EMAIL = process.env.FROM_EMAIL || 'solge@secretariajuridica.gov.co';

const CATEGORIES = {
  'visitors': 'Ingreso Visitantes',
  'transport': 'Transporte Institucional',
  'maintenance': 'Mantenimientos Locativos',
  'rooms': 'Reserva de Salas',
  'parking': 'Parqueadero Institucional'
};

const CATEGORY_COLORS = {
  'visitors': ['#E63946', '#B91C1C'],
  'transport': ['#0077B6', '#023E8A'],
  'maintenance': ['#2A9D8F', '#1F7A6E'],
  'rooms': ['#7209B7', '#4A0677'],
  'parking': ['#F4A261', '#E76F51']
};

/**
 * Plantilla base de diseño premium para los correos
 */
function getHtmlTemplate(title, bodyContent, category = null) {
  const [primary, dark] = CATEGORY_COLORS[category?.toLowerCase()] || ['#0077B6', '#023E8A'];
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #F8FAFC;
          color: #0F172A;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 600px;
          margin: 30px auto;
          background: #FFFFFF;
          border-radius: 16px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          border: 1px solid #E2E8F0;
        }
        .header {
          background: linear-gradient(135deg, ${dark} 0%, ${primary} 100%);
          padding: 30px;
          text-align: center;
        }
        .header h1 {
          color: #FFFFFF;
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .content {
          padding: 40px 30px;
          line-height: 1.6;
        }
        .footer {
          background-color: #F1F5F9;
          padding: 20px;
          text-align: center;
          font-size: 12px;
          color: #64748B;
          border-top: 1px solid #E2E8F0;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          margin-top: 20px;
          background-color: ${primary};
          color: #FFFFFF !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
        }
        .highlight {
          font-weight: bold;
          color: ${dark};
        }
        .badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 9999px;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }
        .badge-pendiente { background-color: #FEF3C7; color: #D97706; }
        .badge-en_progreso { background-color: #DBEAFE; color: #2563EB; }
        .badge-resuelto { background-color: #D1FAE5; color: #059669; }
        .badge-aprobado { background-color: #D1FAE5; color: #059669; }
        .badge-rechazado { background-color: #FEE2E2; color: #DC2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sistema de Administración de Servicios Generales (SASGE)</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #0F172A;">${title}</h2>
          ${bodyContent}
        </div>
        <div class="footer">
          Este es un correo automático generado por el Sistema de Administración de Servicios Generales (SASGE).<br>
          Alcaldía Mayor de Bogotá - Secretaría Jurídica Distrital.
        </div>
      </div>
    </body>
    </html>
  `;
}

function formatMetadataForEmail(request) {
  const meta = request.metadata;
  if (!meta) return { html: '', attachments: [] };

  let details = '';
  const emailAttachments = [];
  const append = (label, value) => {
    if (value) details += `<br><span class="highlight">${label}:</span> ${value}`;
  };

  const processImage = (attach, type) => {
    if (attach && attach.startsWith('data:image')) {
      const cid = `img_${Math.random().toString(36).substring(7)}`;
      const base64Data = attach.split(';base64,').pop();
      emailAttachments.push({
        filename: `${type}_${cid}.jpg`,
        content: Buffer.from(base64Data, 'base64'),
        cid: cid
      });
      return `cid:${cid}`;
    }
    return attach && attach.startsWith('http') ? attach : 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?q=80&w=1000&auto=format&fit=crop';
  };

  switch (request.category?.toLowerCase()) {
    case 'visitors':
      append('Responsable', meta.responsible?.name);
      append('Dependencia', meta.responsible?.dependency);
      append('Motivo de la Visita', meta.visitReason || meta.reason);
      append('Desde', meta.fromDate);
      append('Hasta', meta.toDate);
      if (Array.isArray(meta.visitors) && meta.visitors.length > 0) {
        const vList = meta.visitors.map(v => `${v.name || 'Sin nombre'} ${v.document ? '(CC/Doc: ' + v.document + ')' : ''}`).join('<br>• ');
        details += `<br><span class="highlight">Nómina de Visitantes (${meta.visitors.length}):</span><br>• ${vList}`;
      }
      if (Array.isArray(meta.vehicles) && meta.vehicles.length > 0) {
        const vehList = meta.vehicles.map(v => `${v.plate || 'Sin placa'} ${v.brand ? '(' + v.brand + ')' : ''}`).join(', ');
        append('Placas y Vehículos Autorizados', vehList);
      }
      break;
    case 'parking':
      append('Funcionario', meta.name);
      append('Dependencia', meta.dependency);
      append('Placa', meta.plate);
      append('Vehículo', (meta.brand || '') + (meta.color ? ' - ' + meta.color : ''));
      break;
    case 'rooms': {
      const roomObj = meta.room;
      const roomName = (roomObj && typeof roomObj === 'object') ? roomObj.name : roomObj;
      append('Sala', roomName);
      
      const formattedDate = meta.date ? `<u>${meta.date}</u>` : null;
      append('Fecha', formattedDate);
      
      const timeVal = meta.time || meta.booking_hours || ((meta.startTime || '') + (meta.endTime ? ' a ' + meta.endTime : ''));
      const formattedTime = timeVal ? `<u>${timeVal}</u>` : null;
      append('Horario', formattedTime);
      
      const organizerVal = meta.responsible_name || meta.responsibleName;
      append('Organizador', organizerVal);
      
      let servicesList = [];
      if (meta.services_description) {
        servicesList.push(meta.services_description);
      }
      if (meta.services && typeof meta.services === 'object') {
        const stdServices = [];
        if (meta.services.projector && meta.services.laptop) {
          stdServices.push('Equipos TIC (Proyector y Laptop)');
        } else {
          if (meta.services.projector) stdServices.push('Proyector');
          if (meta.services.laptop) stdServices.push('Laptop/Portátil');
        }
        if (meta.services.coffee) stdServices.push('Estación de café');
        if (stdServices.length > 0) {
          servicesList.push(stdServices.join(', '));
        }
      }
      if (servicesList.length > 0) {
        append('Servicios Adicionales', servicesList.join(', '));
      }
      break;
    }
    case 'transport':
      append('Persona a Trasladar', meta.passengerName);
      append('Teléfono Contacto', meta.passengerPhone);
      append('Origen', meta.origin || 'Alcaldía Mayor de Bogotá');
      append('Destino', meta.destination);
      append('Fecha del Traslado', meta.date);
      append('Hora de Recogida', meta.pickupTime);
      append('Pasajeros', meta.passengers + ' persona(s)');
      append('Motivo', meta.reason);
      if (meta.requiresReturn) append('Retorno', 'Sí, a las ' + meta.returnTime);
      if (meta.driver) {
        append('Conductor Asignado', `${meta.driver.name || 'Conductor'} ${meta.driver.phone ? '- Tel: ' + meta.driver.phone : ''} ${meta.driver.plate ? '(Vehículo Placa: ' + meta.driver.plate + ')' : ''}`);
      }
      break;
    case 'maintenance':
      append('Ubicación Exacta', meta.locationDetail);
      append('Elemento', meta.element);
      append('Prioridad', meta.urgency?.toUpperCase());
      break;
  }
  
  if (request.attachments && Array.isArray(request.attachments) && request.attachments.length > 0) {
    let imagesHtml = '<div style="margin-top: 15px;"><strong>Evidencia Fotográfica Inicial:</strong><br>';
    request.attachments.forEach(attach => {
      const src = processImage(attach, 'evidencia');
      imagesHtml += `<img src="${src}" alt="Evidencia Inicial" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px; border: 1px solid #E2E8F0;" /><br>`;
    });
    imagesHtml += '</div>';
    details += imagesHtml;
  }

  if (meta.finalImage) {
    let finalHtml = '<div style="margin-top: 15px; border-top: 1px solid #E2E8F0; padding-top: 15px;"><strong>Evidencia de Trabajo Finalizado:</strong><br>';
    const src = processImage(meta.finalImage, 'final');
    finalHtml += `<img src="${src}" alt="Evidencia Final" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 10px; border: 1px solid #10B981;" /><br>`;
    finalHtml += '</div>';
    details += finalHtml;
  }
  
  if (!details) return { html: '', attachments: [] };
  return { 
    html: `<div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #E2E8F0;">
            <strong>Información Específica del Requerimiento:</strong>${details}
          </div>`,
    attachments: emailAttachments
  };
}

/**
 * Procesa imágenes base64 para adjuntarlas como inline CID en correos
 */
function processEmailAttachments(attachments = [], finalImage = null) {
  const emailAttachments = [];

  const handleImage = (attach, type) => {
    if (attach && typeof attach === 'string' && attach.startsWith('data:image')) {
      const cid = `img_${Math.random().toString(36).substring(7)}`;
      const base64Data = attach.split(';base64,').pop();
      emailAttachments.push({
        filename: `${type}_${cid}.jpg`,
        content: Buffer.from(base64Data, 'base64'),
        cid: cid
      });
      return `cid:${cid}`;
    }
    return (attach && typeof attach === 'string' && attach.startsWith('http')) ? attach : null;
  };

  let imagesHtml = '';
  if (Array.isArray(attachments) && attachments.length > 0) {
    const listHtml = attachments.map(att => {
      const src = handleImage(att, 'evidencia');
      return src ? `<img src="${src}" alt="Evidencia Inicial" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px; border: 1px solid #CBD5E1; display: block;" />` : '';
    }).filter(Boolean).join('');

    if (listHtml) {
      imagesHtml += `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
          <strong style="color: #0F172A; font-size: 13px;">Evidencia Fotográfica Inicial:</strong>
          ${listHtml}
        </div>
      `;
    }
  }

  if (finalImage) {
    const src = handleImage(finalImage, 'final');
    if (src) {
      imagesHtml += `
        <div style="margin-top: 14px; padding-top: 12px; border-top: 1px solid #E2E8F0;">
          <strong style="color: #059669; font-size: 13px;">Evidencia de Trabajo Finalizado:</strong>
          <img src="${src}" alt="Evidencia Final" style="max-width: 100%; height: auto; border-radius: 8px; margin-top: 8px; border: 1px solid #10B981; display: block;" />
        </div>
      `;
    }
  }

  return { imagesHtml, emailAttachments };
}

/**
 * Maquetador base institucional para los correos de los 5 servicios
 */
function renderServiceEmailLayout({
  serviceCategory,
  headerSubTitle,
  introParagraph,
  cardItems = [],
  extraSectionsHtml = '',
  closingParagraphs = [],
  actionButton = null,
  footerNote = null
}) {
  const [primary, dark] = CATEGORY_COLORS[serviceCategory?.toLowerCase()] || ['#0077B6', '#023E8A'];
  const fullTitle = `Sistema de Administración de Servicios Generales (SASGE) - ${headerSubTitle}`;

  let cardHtml = '';
  if (cardItems.length > 0 || extraSectionsHtml) {
    cardHtml = `
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 18px 20px; margin: 18px 0;">
        ${cardItems.map(item => `
          <p style="margin: 5px 0; font-size: 14px; line-height: 1.5;">
            <strong style="color: #0F172A;">${item.label}:</strong> 
            <span style="color: #334155;">${item.value || 'N/A'}</span>
          </p>
        `).join('')}
        ${extraSectionsHtml}
      </div>
    `;
  }

  const paragraphsHtml = closingParagraphs.map(p => `
    <p style="margin: 10px 0; font-size: 14px; line-height: 1.6; color: #1E293B;">${p}</p>
  `).join('');

  const btnHtml = actionButton ? `
    <div style="text-align: center; margin-top: 26px;">
      <a href="${actionButton.url}" 
         style="background-color: ${primary}; color: #FFFFFF; text-decoration: none; padding: 11px 24px; border-radius: 6px; font-weight: 700; font-size: 13px; display: inline-block;">
        ${actionButton.text}
      </a>
    </div>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body {
          font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
          background-color: #F8FAFC;
          color: #0F172A;
          margin: 0;
          padding: 0;
        }
        .container {
          max-width: 620px;
          margin: 25px auto;
          background: #FFFFFF;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 14px rgba(0, 0, 0, 0.05);
          border: 1px solid #E2E8F0;
        }
        .header {
          background: linear-gradient(135deg, ${dark} 0%, ${primary} 100%);
          padding: 24px 26px;
          text-align: center;
        }
        .header h1 {
          color: #FFFFFF;
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          letter-spacing: 0.3px;
        }
        .content {
          padding: 28px 26px;
          line-height: 1.6;
          font-size: 14px;
          color: #0F172A;
        }
        .footer {
          background-color: #F1F5F9;
          padding: 16px;
          text-align: center;
          font-size: 12px;
          color: #64748B;
          border-top: 1px solid #E2E8F0;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>${fullTitle}</h1>
        </div>
        <div class="content">
          ${introParagraph ? `<p style="margin: 0 0 16px 0; font-size: 14px; line-height: 1.6;">${introParagraph}</p>` : ''}
          ${cardHtml}
          ${paragraphsHtml}

          <p style="margin: 20px 0 0 0; font-size: 14px; line-height: 1.6;">
            Cordialmente,<br>
            <strong>Secretaría Jurídica Distrital</strong>
          </p>

          ${btnHtml}
        </div>
        <div class="footer">
          ${footerNote || 'Este es un correo automático generado por el Sistema de Administración de Servicios Generales (SASGE).<br>Alcaldía Mayor de Bogotá - Secretaría Jurídica Distrital.'}
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * 1. INGRESO DE VISITANTES (visitors)
 */
function getVisitorsEmailContent(request, isUserRecipient, isUpdate, status, user) {
  const meta = request.metadata || {};
  const visitorsList = Array.isArray(meta.visitors) && meta.visitors.length > 0 ? meta.visitors : [];
  
  const firstVisitorName = visitorsList[0]?.name || request.title?.replace(/^Ingreso:\s*/i, '') || 'Visitante';
  const visitorSubject = visitorsList.length > 1
    ? visitorsList.map(v => v.name).filter(Boolean).join(', ')
    : firstVisitorName;

  const fromDate = meta.fromDate || 'Por definir';
  const toDate = meta.toDate || meta.fromDate || 'Por definir';
  const dependency = meta.responsible?.dependency || user?.dependency || 'Secretaría Jurídica Distrital';
  const responsibleName = meta.responsible?.name || user?.name || 'Funcionario Responsable';
  const visitReason = meta.visitReason || meta.reason || request.description || 'Sin especificar';

  let visitorsBlock = '';
  if (visitorsList.length > 0) {
    visitorsBlock = visitorsList.map((v, index) => `
      <p style="margin: 8px 0 2px 0; font-size: 14px; color: #0F172A;">
        <strong>Visitante ${index + 1}:</strong> ${v.name || 'Sin nombre'}
      </p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">
        <strong>Documento:</strong> ${v.document || 'No especificado'}
      </p>
    `).join('');
  } else {
    visitorsBlock = `
      <p style="margin: 8px 0 2px 0; font-size: 14px; color: #0F172A;">
        <strong>Visitante 1:</strong> ${firstVisitorName}
      </p>
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #334155;">
        <strong>Documento:</strong> No especificado
      </p>
    `;
  }

  let vehiclesText = 'Ninguno';
  const vehArr = (meta.hasVehicle && Array.isArray(meta.vehicles) && meta.vehicles.length > 0)
    ? meta.vehicles
    : (Array.isArray(meta.vehicles) && meta.vehicles.length > 0 ? meta.vehicles : []);

  if (vehArr.length > 0) {
    const list = vehArr.map(vh => `${vh.plate || 'Sin placa'}-${vh.brand || 'Sin marca'}`).filter(Boolean);
    if (list.length > 0) vehiclesText = list.join(', ');
  }

  const extraSectionsHtml = `
    <div style="border-top: 1px solid #E2E8F0; margin: 14px 0 10px 0; padding-top: 8px;">
      ${visitorsBlock}
    </div>
    <div style="border-top: 1px solid #E2E8F0; margin-top: 10px; padding-top: 10px;">
      <p style="margin: 4px 0;"><strong>Vehículos:</strong> ${vehiclesText}</p>
    </div>
  `;

  // CASO: DESTINATARIO ADMINISTRADOR / PORTERÍA
  if (!isUserRecipient) {
    const subject = `Solicitud de autorización de ingreso – ${visitorSubject}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'visitors',
      headerSubTitle: 'Ingresos',
      introParagraph: 'Desde la Secretaría Jurídica Distrital, nos permitimos solicitar la autorización de ingreso a las instalaciones de los siguientes visitantes y vehículos relacionados a continuación:',
      cardItems: [
        { label: 'Fecha de ingreso', value: fromDate },
        { label: 'Fecha de salida', value: toDate },
        { label: 'Dependencia a visitar', value: dependency },
        { label: 'Funcionario responsable', value: responsibleName },
        { label: 'Motivo de la visita', value: visitReason }
      ],
      extraSectionsHtml,
      closingParagraphs: [
        'Agradecemos autorizar el ingreso del visitante relacionado, de acuerdo con los protocolos establecidos para el acceso a las instalaciones.',
        'Quedamos atentos a cualquier información adicional que se requiera para gestionar el ingreso.'
      ],
      actionButton: {
        text: 'Ver Solicitud en SASGE',
        url: 'https://sasge.secretariajuridica.gov.co/admin/manage'
      }
    });
    return { subject, html };
  }

  // CASO: DESTINATARIO FUNCIONARIO SOLICITANTE
  if (!isUpdate) {
    // Creación
    const subject = `Solicitud de ingreso registrada – ${visitorSubject}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'visitors',
      headerSubTitle: 'Ingresos',
      introParagraph: `Apreciado(a) <strong>${user?.name || 'Funcionario(a)'}</strong>, tu solicitud de autorización de ingreso de visitantes ha sido radicada correctamente en el sistema:`,
      cardItems: [
        { label: 'Fecha de ingreso', value: fromDate },
        { label: 'Fecha de salida', value: toDate },
        { label: 'Dependencia anfitriona', value: dependency },
        { label: 'Motivo de la visita', value: visitReason }
      ],
      extraSectionsHtml,
      closingParagraphs: [
        'La solicitud ha sido remitida al equipo de recepción y seguridad para la validación y autorización de acceso correspondiente.',
        'Te notificaremos por este medio cuando la solicitud sea gestionada.'
      ]
    });
    return { subject, html };
  } else {
    // Actualización
    const isApproved = status === 'resuelto' || status === 'aprobado';
    const isRejected = status === 'rechazado';
    const statusText = isApproved ? 'AUTORIZADO' : isRejected ? 'NO AUTORIZADO' : (status?.toUpperCase() || 'EN TRÁMITE');
    const subject = isApproved 
      ? `Ingreso de visitantes autorizado – ${visitorSubject}`
      : `Solicitud de ingreso actualizada – Estado: ${statusText}`;

    const adminNote = request.admin_notes ? `<p style="margin-top: 10px; color: #78350F; background: #FEF3C7; padding: 10px; border-radius: 6px;"><strong>Observaciones:</strong> ${request.admin_notes}</p>` : '';

    const html = renderServiceEmailLayout({
      serviceCategory: 'visitors',
      headerSubTitle: 'Ingresos',
      introParagraph: isApproved 
        ? `Te informamos que la solicitud de autorización de ingreso ha sido <strong>APROBADA</strong> por la administración:`
        : `Te informamos que la solicitud de ingreso de visitantes se encuentra en estado <strong>${statusText}</strong>:`,
      cardItems: [
        { label: 'Fecha autorizada', value: fromDate === toDate ? fromDate : `${fromDate} al ${toDate}` },
        { label: 'Dependencia', value: dependency },
        { label: 'Motivo', value: visitReason },
        { label: 'Estado', value: statusText }
      ],
      extraSectionsHtml: extraSectionsHtml + adminNote,
      closingParagraphs: isApproved ? [
        'La portería y el personal de seguridad cuentan con el registro para facilitar el acceso en las fechas autorizadas.',
        'Recuerda que cada visitante debe presentar su documento de identidad original en la recepción.'
      ] : [
        'Puedes ingresar a la plataforma SASGE si requieres verificar detalles adicionales o radicar una nueva solicitud.'
      ]
    });
    return { subject, html };
  }
}

/**
 * 2. RESERVA DE SALAS (rooms)
 */
function getRoomsEmailContent(request, isUserRecipient, isUpdate, status, user) {
  let meta = request.metadata || {};
  if (typeof meta === 'string') {
    try { meta = JSON.parse(meta); } catch (e) { meta = {}; }
  }
  const roomObj = meta.room;
  const roomName = (roomObj && typeof roomObj === 'object') ? (roomObj.name || 'Sala Regular') : (roomObj || 'Sala Regular');
  const date = meta.date || 'Por confirmar';
  const time = meta.time || meta.booking_hours || ((meta.startTime || '') + (meta.endTime ? ' a ' + meta.endTime : '')) || 'Horario por confirmar';
  const organizer = meta.responsible_name || meta.responsibleName || user?.name || request.user_name || 'Funcionario Solicitante';
  const dependency = meta.dependency || user?.dependency || 'Secretaría Jurídica Distrital';
  const phone = meta.contact_phone || user?.phone || 'No registrado';
  const attendees = meta.participants_count || meta.attendees || '4';
  const activity = meta.activity_name || request.title?.replace(/^Reserva:\s*/i, '') || 'Reunión de trabajo';

  // Servicios
  const srvList = [];
  if (meta.services?.coffee) srvList.push('Estación de café');
  if (meta.services?.projector) srvList.push('Proyector');
  if (meta.services?.laptop) srvList.push('Laptop');
  if (meta.services_description) srvList.push(meta.services_description);
  const servicesText = srvList.length > 0 ? srvList.join(', ') : 'Ninguno';

  // CASO: DESTINATARIO ADMINISTRADOR DE SALAS / SECRETARÍA GENERAL
  if (!isUserRecipient) {
    const isSecGeneral = meta.requires_secretaria_general === true ||
                         meta.info === 'Especial' ||
                         (parseInt(meta.capacity) || 0) >= 100 ||
                         /huitaca|secretar[ií]a\s*general|auditorio/i.test(roomName);

    const cleanStatus = String(status || request.status || '').toLowerCase().trim();
    const isApproved = ['resuelto', 'aprobado', 'resuelta', 'aprobada', 'approved', 'resolved'].includes(cleanStatus);

    let subject = `Solicitud de reserva de espacio – ${roomName} – ${date}`;
    let introParagraph = 'Desde la Secretaría Jurídica Distrital, nos permitimos solicitar la gestión y asignación del siguiente espacio institucional:';
    let headerSubTitle = 'Reserva de Salas';

    if (isSecGeneral) {
      headerSubTitle = isApproved ? 'Autorización de Espacio Especial' : 'Solicitud de Espacio Especial';
      subject = isApproved
        ? `Reserva Aprobada – ${roomName} (${date})`
        : `Solicitud de reserva de espacio – ${roomName} (${date})`;
      introParagraph = isApproved
        ? 'Nos permitimos informar a la Secretaría General de la Alcaldía Mayor de Bogotá que la siguiente reserva de espacio ha sido APROBADA en SASGE:'
        : 'Desde la Secretaría Jurídica Distrital, nos permitimos remitir la solicitud de reserva para el siguiente espacio de la Secretaría General:';
    } else if (isApproved) {
      subject = `Alerta de Servicio: Reserva Aprobada – ${roomName} (${date})`;
      introParagraph = 'Una reserva de sala ha sido aprobada y se requiere la coordinación o ejecución logística del espacio:';
    }

    const cardItems = isSecGeneral ? [
      { label: 'Espacio Especial', value: roomName },
      { label: 'Fecha del Evento', value: date },
      { label: 'Horario Reserva (Montaje)', value: time },
      { label: 'Horario Real del Evento', value: (meta.event_start_hour && meta.event_end_hour) ? `${meta.event_start_hour} - ${meta.event_end_hour}` : time },
      { label: 'Entidad Solicitante', value: meta.entity_name || dependency },
      { label: 'Actividad / Evento', value: activity },
      { label: 'Descripción', value: meta.activity_description || request.description },
      { label: 'Responsable', value: organizer },
      { label: 'Cargo Responsable', value: meta.responsible_role || 'Funcionario' },
      { label: 'Teléfono Contacto', value: phone },
      { label: 'Aforo / Asistentes', value: `${attendees} persona(s)` },
      { label: 'Modalidad', value: meta.meeting_type || 'Presencial' },
      { label: 'Servicios Logísticos', value: meta.services_description || servicesText },
      { label: 'Requerimientos Técnicos', value: Array.isArray(meta.tech_requirements) ? meta.tech_requirements.join(', ') : 'Ninguno' },
      { label: 'Declaración y Póliza SJD', value: meta.manifestation_express ? 'Aceptada y Acreditada' : 'Aceptada' }
    ] : [
      { label: 'Espacio Solicitado', value: roomName },
      { label: 'Fecha de la Reserva', value: date },
      { label: 'Horario', value: time },
      { label: 'Actividad / Evento', value: activity },
      { label: 'Funcionario Organizador', value: organizer },
      { label: 'Dependencia', value: dependency },
      { label: 'Teléfono / Contacto', value: phone },
      { label: 'Asistentes Previstos', value: `${attendees} persona(s)` },
      { label: 'Servicios Logísticos / TIC', value: servicesText }
    ];

    const closingParagraphs = isSecGeneral && isApproved ? [
      'Se solicita formalizar la reserva en la agenda del Auditorio Huitaca y coordinar el inventario para la entrega del espacio.',
      'La entidad solicitante entregará el listado de asistentes y del personal de apoyo logístico y brigadistas con antelación conforme a los lineamientos establecidos.',
      'Quedamos atentos a cualquier inquietud adicional.'
    ] : [
      'Agradecemos verificar la agenda del espacio y formalizar la aprobación y alistamiento correspondiente.',
      'Quedamos atentos a cualquier inquietud o coordinación logística.'
    ];

    const html = renderServiceEmailLayout({
      serviceCategory: 'rooms',
      headerSubTitle,
      introParagraph,
      cardItems,
      closingParagraphs,
      actionButton: {
        text: 'Gestionar Reserva en SASGE',
        url: 'https://sasge.secretariajuridica.gov.co/admin/manage'
      }
    });
    return { subject, html };
  }

  // CASO: DESTINATARIO FUNCIONARIO SOLICITANTE
  if (!isUpdate) {
    const subject = `Confirmación de radicación – Reserva de Sala ${roomName} (${date})`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'rooms',
      headerSubTitle: 'Reserva de Salas',
      introParagraph: `Apreciado(a) <strong>${organizer}</strong>, tu solicitud de reserva de sala ha sido radicada exitosamente:`,
      cardItems: [
        { label: 'Espacio', value: roomName },
        { label: 'Fecha', value: date },
        { label: 'Horario', value: time },
        { label: 'Evento', value: activity },
        { label: 'Servicios solicitados', value: servicesText }
      ],
      closingParagraphs: [
        'El equipo de administración de salas revisará la disponibilidad de la agenda y te confirmará la reserva oportunamente.'
      ]
    });
    return { subject, html };
  } else {
    const isApproved = status === 'resuelto' || status === 'aprobado';
    const isRejected = status === 'rechazado';
    const statusText = isApproved ? 'APROBADA' : isRejected ? 'NO DISPONIBLE' : (status?.toUpperCase() || 'EN PROCESO');
    const subject = isApproved 
      ? `Reserva Aprobada – ${roomName} (${date})`
      : `Actualización de reserva – ${roomName} (${statusText})`;

    const adminNote = request.admin_notes ? `<p style="margin-top: 10px; color: #78350F; background: #FEF3C7; padding: 10px; border-radius: 6px;"><strong>Observaciones:</strong> ${request.admin_notes}</p>` : '';

    const html = renderServiceEmailLayout({
      serviceCategory: 'rooms',
      headerSubTitle: 'Reserva de Salas',
      introParagraph: isApproved
        ? `¡Tu reserva de espacio institucional ha sido <strong>CONFIRMADA</strong>!`
        : `Te informamos que tu solicitud de reserva se encuentra en estado <strong>${statusText}</strong>:`,
      cardItems: [
        { label: 'Espacio', value: roomName },
        { label: 'Fecha', value: date },
        { label: 'Horario', value: time },
        { label: 'Estado', value: statusText }
      ],
      extraSectionsHtml: adminNote,
      closingParagraphs: isApproved ? [
        'Por favor ten presentes los lineamientos de uso del espacio: iniciar y finalizar dentro del horario reservado, hacer uso responsable de los equipos y entregar la sala en perfecto estado.',
        'Si requieres cancelar o reprogramar, por favor infórmalo con antelación en SASGE.'
      ] : [
        'Puedes consultar la disponibilidad de otros espacios o fechas a través de la plataforma SASGE.'
      ]
    });
    return { subject, html };
  }
}

/**
 * 3. TRANSPORTE INSTITUCIONAL (transport)
 */
function getTransportEmailContent(request, isUserRecipient, isUpdate, status, user) {
  const meta = request.metadata || {};
  const passengerName = meta.passengerName || user?.name || request.user_name || 'Funcionario';
  const phone = meta.passengerPhone || user?.phone || 'No registrado';
  const origin = meta.origin || 'Alcaldía Mayor de Bogotá (Manzana Liévano)';
  const destination = meta.destination || 'Por definir';
  const date = meta.date || 'Por definir';
  const pickupTime = meta.pickupTime || 'Por definir';
  const passengers = meta.passengers || '1';
  const reason = meta.reason || request.description || 'Diligencia oficial';
  const requiresReturn = meta.requiresReturn ? `Sí (Hora retorno: ${meta.returnTime || 'Por confirmar'})` : 'No';

  let driverSectionHtml = '';
  if (meta.driver) {
    driverSectionHtml = `
      <div style="border-top: 1px solid #CBD5E1; margin-top: 12px; padding-top: 10px;">
        <strong style="color: #0369A1;">Conductor y Vehículo Asignado:</strong><br>
        <span style="color: #0F172A; font-weight: 700;">Conductor:</span> ${meta.driver.name || 'Conductor asignado'}<br>
        <span style="color: #0F172A; font-weight: 700;">Contacto:</span> ${meta.driver.phone || 'No registrado'}<br>
        <span style="color: #0F172A; font-weight: 700;">Vehículo Placa:</span> ${meta.driver.plate || 'Institucional'}
      </div>
    `;
  }

  // CASO: DESTINATARIO ADMINISTRADOR / EQUIPO DE TRANSPORTE
  if (!isUserRecipient) {
    const subject = `Solicitud de servicio de transporte – ${passengerName} – ${destination}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'transport',
      headerSubTitle: 'Transporte Institucional',
      introParagraph: 'Desde la Secretaría Jurídica Distrital, nos permitimos solicitar la programación de servicio de transporte para la siguiente comisión o diligencia oficial:',
      cardItems: [
        { label: 'Fecha del Traslado', value: date },
        { label: 'Hora de Recogida', value: pickupTime },
        { label: 'Origen', value: origin },
        { label: 'Destino', value: destination },
        { label: 'Requiere Retorno', value: requiresReturn },
        { label: 'Funcionario / Pasajero', value: passengerName },
        { label: 'Teléfono de Contacto', value: phone },
        { label: 'Dependencia', value: user?.dependency || meta.dependency || 'SJD' },
        { label: 'Cantidad de Pasajeros', value: `${passengers} persona(s)` },
        { label: 'Motivo del Traslado', value: reason }
      ],
      extraSectionsHtml: driverSectionHtml,
      closingParagraphs: [
        'Agradecemos programar el vehículo correspondiente y coordinar la logística con el funcionario solicitante.',
        'Quedamos atentos a la confirmación del servicio.'
      ],
      actionButton: {
        text: 'Gestionar Transporte en SASGE',
        url: 'https://sasge.secretariajuridica.gov.co/admin/manage'
      }
    });
    return { subject, html };
  }

  // CASO: DESTINATARIO FUNCIONARIO SOLICITANTE / PASAJERO
  if (!isUpdate) {
    const subject = `Solicitud de transporte radicada – ${destination} (${date})`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'transport',
      headerSubTitle: 'Transporte Institucional',
      introParagraph: `Apreciado(a) <strong>${passengerName}</strong>, tu requerimiento de transporte oficial ha sido radicado exitosamente:`,
      cardItems: [
        { label: 'Fecha', value: date },
        { label: 'Hora de recogida', value: pickupTime },
        { label: 'Origen', value: origin },
        { label: 'Destino', value: destination },
        { label: 'Retorno', value: requiresReturn },
        { label: 'Pasajeros', value: `${passengers} persona(s)` }
      ],
      closingParagraphs: [
        'El área de transporte revisará la programación operativa y te notificará los datos del vehículo y conductor asignado.'
      ]
    });
    return { subject, html };
  } else {
    const isApproved = status === 'resuelto' || status === 'aprobado' || status === 'en_progreso';
    const isRejected = status === 'rechazado';
    const statusText = isApproved ? 'PROGRAMADO' : isRejected ? 'NO DISPONIBLE' : (status?.toUpperCase() || 'EN GESTIÓN');
    const subject = isApproved 
      ? `Servicio de transporte programado – ${destination} (${date})`
      : `Actualización de servicio de transporte – ${statusText}`;

    const adminNote = request.admin_notes ? `<p style="margin-top: 10px; color: #78350F; background: #FEF3C7; padding: 10px; border-radius: 6px;"><strong>Observaciones:</strong> ${request.admin_notes}</p>` : '';

    const html = renderServiceEmailLayout({
      serviceCategory: 'transport',
      headerSubTitle: 'Transporte Institucional',
      introParagraph: isApproved 
        ? `Te informamos que tu servicio de transporte oficial ha sido <strong>PROGRAMADO</strong>:`
        : `Te informamos sobre la actualización de tu solicitud de transporte oficial:`,
      cardItems: [
        { label: 'Fecha', value: date },
        { label: 'Hora de recogida', value: pickupTime },
        { label: 'Origen', value: origin },
        { label: 'Destino', value: destination },
        { label: 'Estado', value: statusText }
      ],
      extraSectionsHtml: driverSectionHtml + adminNote,
      closingParagraphs: isApproved ? [
        'Recomendamos presentarse en el punto de encuentro 10 minutos antes de la hora indicada y portar tu carnet de la entidad.',
        'Ante cualquier cambio o imprevisto, por favor contactar directamente al conductor o al área de transporte.'
      ] : [
        'Si tienes dudas sobre la programación, puedes consultar a través del sistema SASGE.'
      ]
    });
    return { subject, html };
  }
}

/**
 * 4. MANTENIMIENTOS LOCATIVOS (maintenance)
 */
function getMaintenanceEmailContent(request, isUserRecipient, isUpdate, status, user) {
  const meta = request.metadata || {};
  const element = meta.element || request.title?.replace(/^Mantenimiento:\s*/i, '') || 'Mantenimiento locativo';
  const location = `${meta.floor ? 'Piso ' + meta.floor : ''} ${meta.room ? '- ' + meta.room : ''} ${meta.locationDetail ? '(' + meta.locationDetail + ')' : ''}`.trim() || 'Sede SJD';
  const urgency = meta.urgency || meta.priority || request.priority || 'Normal';
  const description = request.description || meta.description || 'Sin descripción adicional';
  const requester = user?.name || request.user_name || 'Funcionario';
  const dependency = user?.dependency || meta.dependency || 'Secretaría Jurídica Distrital';

  const { imagesHtml, emailAttachments } = processEmailAttachments(request.attachments, meta.finalImage);

  // CASO: DESTINATARIO ADMINISTRADOR / EQUIPO TÉCNICO
  if (!isUserRecipient) {
    const subject = `Reporte de mantenimiento locativo – ${element} – ${location}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'maintenance',
      headerSubTitle: 'Mantenimientos Locativos',
      introParagraph: 'Desde la Secretaría Jurídica Distrital, nos permitimos reportar el siguiente requerimiento de mantenimiento locativo para su correspondiente diagnóstico y atención técnica:',
      cardItems: [
        { label: 'Elemento / Asunto', value: element },
        { label: 'Ubicación Exacta', value: location },
        { label: 'Nivel de Urgencia', value: urgency.toUpperCase() },
        { label: 'Funcionario que Reporta', value: requester },
        { label: 'Dependencia', value: dependency },
        { label: 'Descripción del Reporte', value: description }
      ],
      extraSectionsHtml: imagesHtml,
      closingParagraphs: [
        'Agradecemos coordinar con el personal técnico o contratista la visita de inspección y labores de reparación correspondientes.'
      ],
      actionButton: {
        text: 'Atender Mantenimiento en SASGE',
        url: 'https://sasge.secretariajuridica.gov.co/admin/manage'
      }
    });
    return { subject, html, attachments: emailAttachments };
  }

  // CASO: DESTINATARIO FUNCIONARIO SOLICITANTE
  if (!isUpdate) {
    const subject = `Reporte de mantenimiento recibido – ${element}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'maintenance',
      headerSubTitle: 'Mantenimientos Locativos',
      introParagraph: `Apreciado(a) <strong>${requester}</strong>, hemos recibido tu reporte de novedad locativa:`,
      cardItems: [
        { label: 'Novedad', value: element },
        { label: 'Ubicación', value: location },
        { label: 'Urgencia', value: urgency.toUpperCase() },
        { label: 'Descripción', value: description }
      ],
      extraSectionsHtml: imagesHtml,
      closingParagraphs: [
        'El equipo de servicios generales programará la visita técnica para atender el requerimiento lo antes posible.'
      ]
    });
    return { subject, html, attachments: emailAttachments };
  } else {
    const isResolved = status === 'resuelto';
    const isProgress = status === 'en_progreso';
    const statusText = isResolved ? 'FINALIZADO' : isProgress ? 'EN ATENCIÓN TÉCNICA' : (status?.toUpperCase() || 'ACTUALIZADO');
    const subject = isResolved 
      ? `Mantenimiento locativo finalizado – ${element}`
      : `Actualización de mantenimiento – ${element} (${statusText})`;

    const adminNote = request.admin_notes ? `<p style="margin-top: 10px; color: #78350F; background: #FEF3C7; padding: 10px; border-radius: 6px;"><strong>Observaciones del Técnico:</strong> ${request.admin_notes}</p>` : '';

    const html = renderServiceEmailLayout({
      serviceCategory: 'maintenance',
      headerSubTitle: 'Mantenimientos Locativos',
      introParagraph: isResolved
        ? `Te informamos que el reporte de mantenimiento locativo ha sido <strong>SOLUCIONADO Y FINALIZADO</strong> exitosamente:`
        : `Te informamos que tu reporte de mantenimiento locativo se encuentra en estado <strong>${statusText}</strong>:`,
      cardItems: [
        { label: 'Elemento', value: element },
        { label: 'Ubicación', value: location },
        { label: 'Estado', value: statusText }
      ],
      extraSectionsHtml: imagesHtml + adminNote,
      closingParagraphs: isResolved ? [
        'Agradecemos tu reporte para el cuidado, preservación y buen estado de las instalaciones de la entidad.'
      ] : [
        'El equipo técnico se encuentra adelantando las labores correspondientes para solucionar la novedad.'
      ]
    });
    return { subject, html, attachments: emailAttachments };
  }
}

/**
 * 5. PARQUEADERO INSTITUCIONAL (parking)
 */
function getParkingEmailContent(request, isUserRecipient, isUpdate, status, user) {
  const meta = request.metadata || {};
  const name = meta.name || user?.name || request.user_name || 'Funcionario';
  const doc = meta.doc || 'No registrado';
  const dependency = meta.dependency || user?.dependency || 'Secretaría Jurídica Distrital';
  const plate = meta.plate ? meta.plate.toUpperCase() : 'Por confirmar';
  const vehicleInfo = `${meta.brand || ''} ${meta.color ? '- ' + meta.color : ''}`.trim() || 'Vehículo particular';

  // CASO: DESTINATARIO ADMINISTRADOR / VIGILANCIA
  if (!isUserRecipient) {
    const subject = `Solicitud de asignación de parqueadero – ${name} – Placa ${plate}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'parking',
      headerSubTitle: 'Parqueadero Institucional',
      introParagraph: 'Desde la Secretaría Jurídica Distrital, nos permitimos solicitar la gestión de cupo de estacionamiento para el siguiente servidor público:',
      cardItems: [
        { label: 'Funcionario Solicitante', value: name },
        { label: 'Documento de Identidad', value: doc },
        { label: 'Dependencia', value: dependency },
        { label: 'Placa del Vehículo', value: plate },
        { label: 'Vehículo (Marca / Color)', value: vehicleInfo }
      ],
      closingParagraphs: [
        'Agradecemos verificar la disponibilidad y asignación de cupo conforme a la reglamentación y lineamientos de la Manzana Liévano.',
        'Quedamos atentos a la confirmación del trámite.'
      ],
      actionButton: {
        text: 'Gestionar Parqueadero en SASGE',
        url: 'https://sasge.secretariajuridica.gov.co/admin/manage'
      }
    });
    return { subject, html };
  }

  // CASO: DESTINATARIO FUNCIONARIO SOLICITANTE
  if (!isUpdate) {
    const subject = `Solicitud de parqueadero radicada – Placa ${plate}`;
    const html = renderServiceEmailLayout({
      serviceCategory: 'parking',
      headerSubTitle: 'Parqueadero Institucional',
      introParagraph: `Apreciado(a) <strong>${name}</strong>, tu solicitud de asignación de parqueadero ha sido radicada exitosamente en el sistema:`,
      cardItems: [
        { label: 'Funcionario', value: name },
        { label: 'Dependencia', value: dependency },
        { label: 'Placa del Vehículo', value: plate },
        { label: 'Vehículo', value: vehicleInfo }
      ],
      closingParagraphs: [
        'La Dirección de Gestión Corporativa evaluará la disponibilidad de cupos conforme a la normatividad interna y te notificará la respuesta oportuna.'
      ]
    });
    return { subject, html };
  } else {
    const isApproved = status === 'resuelto' || status === 'aprobado';
    const isRejected = status === 'rechazado';
    const statusText = isApproved ? 'AUTORIZADO' : isRejected ? 'NO DISPONIBLE' : (status?.toUpperCase() || 'EN TRÁMITE');
    const subject = isApproved 
      ? `Cupo de parqueadero autorizado – Placa ${plate}`
      : `Actualización de cupo de parqueadero – Placa ${plate} (${statusText})`;

    const adminNote = request.admin_notes ? `<p style="margin-top: 10px; color: #78350F; background: #FEF3C7; padding: 10px; border-radius: 6px;"><strong>Observaciones:</strong> ${request.admin_notes}</p>` : '';

    const html = renderServiceEmailLayout({
      serviceCategory: 'parking',
      headerSubTitle: 'Parqueadero Institucional',
      introParagraph: isApproved
        ? `Te informamos que tu solicitud de cupo de estacionamiento ha sido <strong>APROBADA</strong>:`
        : `Te informamos sobre la actualización de tu solicitud de parqueadero:`,
      cardItems: [
        { label: 'Placa Autorizada', value: plate },
        { label: 'Vehículo', value: vehicleInfo },
        { label: 'Servidor', value: name },
        { label: 'Estado', value: statusText }
      ],
      extraSectionsHtml: adminNote,
      closingParagraphs: isApproved ? [
        'Por favor ten presentes las normas de acceso: conducir a una velocidad máxima de 10 Km/h, apagar el vehículo al ingresar, portar carnet de la entidad y usar el casco reglamentario en caso de motocicletas.',
        'Recuerda ubicar el vehículo en el espacio asignado por el personal de vigilancia.'
      ] : [
        'En esta ocasión no fue posible asignar cupo por disponibilidad de espacios en la sede.'
      ]
    });
    return { subject, html };
  }
}

/**
 * Fallback genérico para solicitudes no categorizadas
 */
function getGenericEmailContent(request, isUserRecipient, isUpdate, status, user) {
  const categoryName = CATEGORIES[request.category?.toLowerCase()] || request.category || 'General';
  const userName = user?.name || user?.full_name || request.user_name || 'Funcionario';
  const { html: metadataHtml, attachments: emailAttachments } = formatMetadataForEmail(request);

  if (!isUserRecipient) {
    const subject = `SASGE: Solicitud en gestión - ${categoryName} - ${request.title}`;
    const html = renderServiceEmailLayout({
      serviceCategory: request.category,
      headerSubTitle: categoryName,
      introParagraph: 'Se requiere la gestión de la siguiente solicitud en el sistema:',
      cardItems: [
        { label: 'Título', value: request.title },
        { label: 'Descripción', value: request.description },
        { label: 'Prioridad', value: request.priority ? request.priority.toUpperCase() : 'NORMAL' }
      ],
      extraSectionsHtml: metadataHtml,
      closingParagraphs: ['Por favor ingresar a SASGE para gestionar el requerimiento.'],
      actionButton: { text: 'Gestionar en SASGE', url: 'https://sasge.secretariajuridica.gov.co/admin/manage' }
    });
    return { subject, html, attachments: emailAttachments };
  } else {
    const subject = isUpdate 
      ? `SASGE: Actualización de solicitud - ${request.title}`
      : `SASGE: Solicitud radicada - ${request.title}`;
    const html = renderServiceEmailLayout({
      serviceCategory: request.category,
      headerSubTitle: categoryName,
      introParagraph: isUpdate
        ? `Apreciado(a) <strong>${userName}</strong>, tu solicitud ha cambiado de estado:`
        : `Apreciado(a) <strong>${userName}</strong>, tu solicitud ha sido radicada:`,
      cardItems: [
        { label: 'Título', value: request.title },
        { label: 'Descripción', value: request.description },
        { label: 'Estado', value: status || request.status }
      ],
      extraSectionsHtml: metadataHtml,
      closingParagraphs: ['Te notificaremos ante cualquier novedad.']
    });
    return { subject, html, attachments: emailAttachments };
  }
}

/**
 * Enrutador principal que despacha al generador correspondiente
 */
function getServiceEmailData({ request, user, isUserRecipient, isUpdate, triggerStatus }) {
  const category = request.category?.toLowerCase();
  switch (category) {
    case 'visitors':
      return getVisitorsEmailContent(request, isUserRecipient, isUpdate, triggerStatus, user);
    case 'rooms':
      return getRoomsEmailContent(request, isUserRecipient, isUpdate, triggerStatus, user);
    case 'transport':
      return getTransportEmailContent(request, isUserRecipient, isUpdate, triggerStatus, user);
    case 'maintenance':
      return getMaintenanceEmailContent(request, isUserRecipient, isUpdate, triggerStatus, user);
    case 'parking':
      return getParkingEmailContent(request, isUserRecipient, isUpdate, triggerStatus, user);
    default:
      return getGenericEmailContent(request, isUserRecipient, isUpdate, triggerStatus, user);
  }
}

function logEmailDispatch(flowName, toRecipients, subject, category, extraInfo = '') {
  console.log('\n==================== 📧 DISPARO DE CORREO SALIENTE ====================');
  console.log(`📍 ORIGEN / EVENTO:   ${flowName}`);
  console.log(`🏷️  CATEGORÍA:        ${category || 'General'}`);
  console.log(`📤 REMITENTE (FROM):  ${FROM_EMAIL}`);
  console.log(`📥 DESTINO (TO):      ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients}`);
  console.log(`📝 ASUNTO:            ${subject}`);
  if (extraInfo) console.log(`ℹ️  DETALLES:          ${extraInfo}`);
  console.log('========================================================================\n');
}

/**
 * Envía correo al funcionario confirmando la creación de su solicitud
 */
async function sendRequestCreatedNotification(user, request) {
  if (!user?.email) {
    console.warn('⚠️ [EMAIL CANCELADO] Solicitante sin correo electrónico registrado.');
    return;
  }
  const emailData = getServiceEmailData({ request, user, isUserRecipient: true, isUpdate: false });
  logEmailDispatch('Confirmación de Radicación al Solicitante (sendRequestCreatedNotification)', user.email, emailData.subject, request.category, `Solicitud #${request.id}`);

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      attachments: emailData.attachments || []
    });
    console.log(`✅ [ÉXITO] Correo de radicación entregado al solicitante: ${user.email} (MessageId: ${info?.messageId || 'N/A'})`);
  } catch (error) {
    console.error(`❌ [FALLO] Error enviando correo de radicación a ${user.email}:`, error);
  }
}

/**
 * Envía correo al funcionario notificando la actualización de su solicitud
 */
async function sendRequestUpdatedNotification(user, request) {
  if (!user?.email) {
    console.warn('⚠️ [EMAIL CANCELADO] Solicitante sin correo electrónico registrado.');
    return;
  }
  const emailData = getServiceEmailData({ request, user, isUserRecipient: true, isUpdate: true, triggerStatus: request.status });
  logEmailDispatch('Notificación de Actualización al Solicitante (sendRequestUpdatedNotification)', user.email, emailData.subject, request.category, `Solicitud #${request.id} - Estado: ${request.status}`);

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: emailData.subject,
      html: emailData.html,
      attachments: emailData.attachments || []
    });
    console.log(`✅ [ÉXITO] Correo de actualización entregado al solicitante: ${user.email} (Estado: ${request.status}, MessageId: ${info?.messageId || 'N/A'})`);
  } catch (error) {
    console.error(`❌ [FALLO] Error enviando correo de actualización a ${user.email}:`, error);
  }
}

function normalizeRecipients(recipients) {
  if (!recipients) return [];
  const list = Array.isArray(recipients) ? recipients : String(recipients).split(',');
  return list.map(r => String(r || '').trim()).filter(Boolean);
}

/**
 * Envía correo al equipo administrador (service_emails) informando que deben gestionar un servicio
 */
async function sendAdminServiceNotification(adminEmail, request, triggerStatus) {
  const toList = normalizeRecipients(adminEmail);
  if (toList.length === 0) {
    console.warn('⚠️ [EMAIL CANCELADO] Sin destinatarios válidos para sendAdminServiceNotification');
    return;
  }
  const toRecipients = toList.length === 1 ? toList[0] : toList;
  const emailData = getServiceEmailData({ request, user: null, isUserRecipient: false, isUpdate: true, triggerStatus });

  logEmailDispatch('Notificación de Trámite/Aprobación a Encargados (sendAdminServiceNotification)', toRecipients, emailData.subject, request.category, `Solicitud #${request.id} - Estado: ${triggerStatus || request.status}`);

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toRecipients,
      subject: emailData.subject,
      html: emailData.html,
      attachments: emailData.attachments || []
    });
    console.log(`✅ [ÉXITO] Correo administrativo de servicio entregado a: ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients} (MessageId: ${info?.messageId || 'N/A'})`);
  } catch (error) {
    console.error('❌ [FALLO] Error al enviar correo administrativo de servicio:', error);
  }
}

/**
 * Envía correo a los encargados/aprobadores (service_emails) informando que se radicó una nueva solicitud
 */
async function sendAdminNewRequestNotification(adminEmails, request, user) {
  const toList = normalizeRecipients(adminEmails);
  if (toList.length === 0) {
    console.warn('⚠️ [EMAIL CANCELADO] Sin destinatarios válidos para sendAdminNewRequestNotification');
    return;
  }
  const toRecipients = toList.length === 1 ? toList[0] : toList;
  const emailData = getServiceEmailData({ request, user, isUserRecipient: false, isUpdate: false });

  logEmailDispatch('Alerta de Nueva Solicitud a Encargados/Gestores (sendAdminNewRequestNotification)', toRecipients, emailData.subject, request.category, `Solicitud #${request.id} radicada por ${user?.name || 'Funcionario'}`);

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toRecipients,
      subject: emailData.subject,
      html: emailData.html,
      attachments: emailData.attachments || []
    });
    console.log(`✅ [ÉXITO] Correo de nueva solicitud entregado a encargados: ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients} (MessageId: ${info?.messageId || 'N/A'})`);
  } catch (error) {
    console.error('❌ [FALLO] Error al enviar correo de nueva solicitud a encargados:', error);
  }
}

/**
 * Envía correo a la Oficina de TIC cuando una solicitud de sala requiere equipos tecnológicos (Proyector/Laptop)
 */
async function sendTicRoomNotification(ticEmail, request, user) {
  const meta = request.metadata || {};
  const roomObj = meta.room;
  const roomName = (roomObj && typeof roomObj === 'object') ? (roomObj.name || 'Sala de Juntas') : (roomObj || 'Sala de Juntas');
  const roomFloor = (roomObj && typeof roomObj === 'object' && roomObj.floor) ? `(${roomObj.floor})` : '';
  
  const formattedDate = meta.date || 'Fecha por confirmar';
  const timeVal = meta.time || meta.booking_hours || ((meta.startTime || '') + (meta.endTime ? ' a ' + meta.endTime : '')) || 'Horario por confirmar';
  
  const organizerName = user?.name || user?.full_name || meta.responsible_name || meta.responsibleName || 'Funcionario';
  const dependency = meta.dependency || user?.dependency || 'Secretaría Jurídica Distrital';
  const contactPhone = meta.contact_phone || user?.phone || 'No registrado';
  
  const techItems = [];
  if (meta.services?.projector || meta.services?.laptop || meta.services?.tech_tic) {
    techItems.push('Proyector / Videobeam institucional');
    techItems.push('Computador Portátil (Laptop) para presentaciones');
    techItems.push('Cables de conexión HDMI / Adaptadores de video');
  }
  if (Array.isArray(meta.tech_requirements) && meta.tech_requirements.length > 0) {
    meta.tech_requirements.forEach(item => {
      if (!techItems.includes(item)) techItems.push(item);
    });
  }
  if (meta.custom_tech_description && meta.custom_tech_description.trim()) {
    techItems.push(`Especificación adicional: ${meta.custom_tech_description.trim()}`);
  }
  if (techItems.length === 0) {
    techItems.push('Equipos TIC (Proyector y Computador Portátil)');
  }

  const subject = `SASGE TIC: Alistamiento de Equipos - ${roomName} (${formattedDate})`;

  const techSectionsHtml = `
    <div style="border-top: 1px solid #CBD5E1; margin-top: 12px; padding-top: 10px;">
      <strong style="color: #0369A1;">Equipos Tecnológicos Solicitados:</strong>
      <ul style="margin: 8px 0 0 0; padding-left: 20px; color: #1E293B; font-size: 13px; line-height: 1.6;">
        ${techItems.map(item => `<li>${item}</li>`).join('')}
      </ul>
    </div>
  `;

  const html = renderServiceEmailLayout({
    serviceCategory: 'rooms',
    headerSubTitle: 'Soporte TIC para Salas',
    introParagraph: `Se ha programado una reunión en <strong>${roomName} ${roomFloor}</strong> que requiere alistamiento técnico de equipos por parte de la Oficina de TIC:`,
    cardItems: [
      { label: 'Espacio / Sala', value: `${roomName} ${roomFloor}` },
      { label: 'Fecha del Evento', value: formattedDate },
      { label: 'Horario de Uso', value: timeVal },
      { label: 'Organizador', value: organizerName },
      { label: 'Dependencia', value: dependency },
      { label: 'Contacto', value: contactPhone }
    ],
    extraSectionsHtml: techSectionsHtml,
    closingParagraphs: [
      'Agradecemos realizar el alistamiento y verificación de conexión en la sala con 15 minutos de antelación al inicio del horario programado.'
    ],
    actionButton: {
      text: 'Ver Solicitud en SASGE',
      url: 'https://sasge.secretariajuridica.gov.co/admin/manage'
    }
  });

  const toList = normalizeRecipients(ticEmail);
  if (toList.length === 0) {
    console.warn('⚠️ [EMAIL CANCELADO] Sin destinatarios válidos para TIC');
    return;
  }
  const toRecipients = toList.length === 1 ? toList[0] : toList;

  logEmailDispatch('Notificación de Alistamiento a Oficina TIC (sendTicRoomNotification)', toRecipients, subject, 'rooms', `Sala: ${roomName} ${roomFloor}`);

  try {
    const info = await transporter.sendMail({
      from: FROM_EMAIL,
      to: toRecipients,
      subject: subject,
      html: html
    });
    console.log(`✅ [ÉXITO] Notificación TIC entregada a: ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients} (MessageId: ${info?.messageId || 'N/A'})`);
  } catch (error) {
    console.error(`❌ [FALLO] Error al enviar notificación a TIC (${ticEmail}):`, error);
  }
}

module.exports = {
  sendRequestCreatedNotification,
  sendRequestUpdatedNotification,
  sendAdminServiceNotification,
  sendTicRoomNotification,
  sendAdminNewRequestNotification
};
