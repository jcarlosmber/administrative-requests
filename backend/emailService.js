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
      append('Desde', meta.fromDate);
      append('Hasta', meta.toDate);
      if (meta.visitors) append('Visitantes', meta.visitors.length + ' persona(s)');
      if (meta.vehicles) append('Vehículos', meta.vehicles.length + ' vehículo(s)');
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
        if (meta.services.projector) stdServices.push('Proyector');
        if (meta.services.laptop) stdServices.push('Laptop/Portátil');
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
      append('Origen', meta.origin);
      append('Destino', meta.destination);
      append('Fecha', meta.date);
      append('Hora de Recogida', meta.pickupTime);
      append('Pasajeros', meta.passengers + ' persona(s)');
      append('Motivo', meta.reason);
      if (meta.requiresReturn) append('Retorno', 'Sí, a las ' + meta.returnTime);
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
 * Envía correo al funcionario confirmando la creación de su solicitud
 */
async function sendRequestCreatedNotification(user, request) {
  let displayStatus = request.status;
  if (request.category?.toLowerCase() === 'rooms' && request.status === 'resuelto') {
    displayStatus = 'aprobado';
  }

  const subject = `SASGE: Solicitud registrada exitosamente - ${request.title}`;
  
  const statusBadge = `<span class="badge badge-${displayStatus === 'aprobado' ? 'aprobado' : displayStatus}">${displayStatus.toUpperCase()}</span>`;
  const categoryName = CATEGORIES[request.category?.toLowerCase()] || request.category;
  
  // Si el nombre parece ser un username (ej. jcmartinezb), lo ponemos en mayúscula inicial si es posible o usamos uno por defecto
  const userName = user.name || user.full_name || 'Funcionario';
  const { html: metadataHtml, attachments: emailAttachments } = formatMetadataForEmail(request);
  
  const htmlContent = getHtmlTemplate(
    'Confirmación de Solicitud',
    `
      <p>Hola, <span class="highlight">${userName}</span>.</p>
      <p>Tu solicitud de la categoría <span class="highlight">${categoryName.toUpperCase()}</span> ha sido radicada correctamente en el Sistema de Administración de Servicios Generales (SASGE).</p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <strong>Detalles de la Solicitud:</strong><br>
        <span class="highlight">Título:</span> ${request.title}<br>
        <span class="highlight">Descripción:</span> ${request.description}<br>
        <span class="highlight">Prioridad:</span> ${request.priority.toUpperCase()}<br>
        <span class="highlight">Estado Inicial:</span> ${statusBadge}<br>
        <span class="highlight">Fecha:</span> ${new Date(request.created_at).toLocaleString('es-CO')}
        ${metadataHtml}
      </div>
      
      <p>El equipo de servicios generales revisará tu requerimiento y te notificará por este medio sobre cualquier actualización.</p>
    `,
    request.category
  );

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: subject,
      html: htmlContent,
      attachments: emailAttachments
    });
    console.log(`Correo de creación enviado a: ${user.email}`);
  } catch (error) {
    console.error('Error al enviar correo de creación de solicitud:', error);
  }
}

/**
 * Envía correo al funcionario notificando la actualización de su solicitud
 */
async function sendRequestUpdatedNotification(user, request) {
  let displayStatus = request.status;
  if (request.category?.toLowerCase() === 'rooms' && request.status === 'resuelto') {
    displayStatus = 'aprobado';
  }

  const subject = `SASGE: Tu solicitud ha sido actualizada - Estado: ${displayStatus.toUpperCase()}`;
  
  const statusBadge = `<span class="badge badge-${displayStatus === 'aprobado' ? 'aprobado' : displayStatus}">${displayStatus.toUpperCase()}</span>`;
  
  let adminNotesSection = '';
  if (request.admin_notes) {
    adminNotesSection = `
      <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 15px; margin: 20px 0; color: #78350F;">
        <strong>Notas del Administrador / Observaciones:</strong><br>
        ${request.admin_notes}
      </div>
    `;
  }

  const userName = user.name || user.full_name || 'Funcionario';
  const { html: metadataHtml, attachments: emailAttachments } = formatMetadataForEmail(request);

  const htmlContent = getHtmlTemplate(
    'Actualización de Estado',
    `
      <p>Hola, <span class="highlight">${userName}</span>.</p>
      <p>Te informamos que tu solicitud ha cambiado de estado.</p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <strong>Detalles de la Solicitud:</strong><br>
        <span class="highlight">Título:</span> ${request.title}<br>
        <span class="highlight">Descripción:</span> ${request.description}<br>
        <span class="highlight">Prioridad:</span> ${request.priority ? request.priority.toUpperCase() : 'NORMAL'}<br>
        <span class="highlight">Nuevo Estado:</span> ${statusBadge}<br>
        <span class="highlight">Última Actualización:</span> ${new Date(request.updated_at || new Date()).toLocaleString('es-CO')}
        ${metadataHtml}
      </div>
      
      ${adminNotesSection}
      
      <p>Puedes ingresar al sistema en cualquier momento para ver más detalles.</p>
    `,
    request.category
  );

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: subject,
      html: htmlContent,
      attachments: emailAttachments
    });
    console.log(`Correo de actualización enviado a: ${user.email}`);
  } catch (error) {
    console.error('Error al enviar correo de actualización de solicitud:', error);
  }
}

/**
 * Envía correo al equipo administrador (service_emails) informando que deben gestionar un servicio
 */
async function sendAdminServiceNotification(adminEmail, request, triggerStatus) {
  const isApprovedTrigger = triggerStatus === 'resuelto';
  
  let displayStatus = request.status;
  if (request.category?.toLowerCase() === 'rooms' && request.status === 'resuelto') {
    displayStatus = 'aprobado';
  }

  const actionText = isApprovedTrigger 
    ? 'Una solicitud ha sido aprobada y se requiere la ejecución del servicio correspondiente.'
    : 'Una solicitud requiere ser procesada y coordinada (En Progreso).';
    
  const subject = `SASGE: Alerta de Servicio - ${request.title}`;
  const statusBadge = `<span class="badge badge-${displayStatus === 'aprobado' ? 'aprobado' : displayStatus}">${displayStatus.toUpperCase()}</span>`;
  const categoryName = CATEGORIES[request.category?.toLowerCase()] || request.category;
  const { html: metadataHtml, attachments: emailAttachments } = formatMetadataForEmail(request);

  const htmlContent = getHtmlTemplate(
    'Alerta para Equipo Administrador',
    `
      <p>Hola, <strong>Equipo de ${categoryName.toUpperCase()}</strong>.</p>
      <p>${actionText}</p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <strong>Detalles de la Solicitud:</strong><br>
        <span class="highlight">Título:</span> ${request.title}<br>
        <span class="highlight">Descripción:</span> ${request.description}<br>
        <span class="highlight">Prioridad:</span> ${request.priority ? request.priority.toUpperCase() : 'NORMAL'}<br>
        <span class="highlight">Estado Actual:</span> ${statusBadge}<br>
        <span class="highlight">Última Actualización:</span> ${new Date(request.updated_at || new Date()).toLocaleString('es-CO')}
        ${metadataHtml}
      </div>
      
      <p>Por favor, revisa el panel de administrador en SASGE para más detalles y coordinar la logística necesaria.</p>
    `,
    request.category
  );

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: adminEmail,
      subject: subject,
      html: htmlContent,
      attachments: emailAttachments
    });
    console.log(`Correo administrativo enviado a: ${adminEmail}`);
  } catch (error) {
    console.error('Error al enviar correo administrativo:', error);
  }
}

module.exports = {
  sendRequestCreatedNotification,
  sendRequestUpdatedNotification,
  sendAdminServiceNotification
};
