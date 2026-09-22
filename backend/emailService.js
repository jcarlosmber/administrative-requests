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
    console.warn('⚠️ [EMAIL SERVICE] Sin destinatarios válidos para sendAdminServiceNotification');
    return;
  }
  const toRecipients = toList.length === 1 ? toList[0] : toList;

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
      to: toRecipients,
      subject: subject,
      html: htmlContent,
      attachments: emailAttachments
    });
    console.log(`📧 Correo administrativo enviado a: ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients}`);
  } catch (error) {
    console.error('Error al enviar correo administrativo:', error);
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

  const subject = `SASGE TIC: Requerimiento de Equipos para Sala - ${roomName} (${formattedDate})`;

  const techItemsHtml = techItems.map(item => `
    <li style="margin-bottom: 8px; color: #0F172A; font-size: 14px; display: flex; align-items: center;">
      <span style="display: inline-block; width: 18px; height: 18px; background-color: #0284C7; color: #FFFFFF; border-radius: 50%; text-align: center; line-height: 18px; font-size: 11px; margin-right: 10px; font-weight: bold;">✓</span>
      ${item}
    </li>
  `).join('');

  const bodyContent = `
    <div style="background-color: #EFF6FF; border-left: 5px solid #0284C7; padding: 14px 18px; border-radius: 6px; margin-bottom: 22px;">
      <p style="margin: 0; font-size: 14px; color: #0369A1; font-weight: 700;">
        🖥️ Notificación Automática para la Oficina de TIC
      </p>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #0C4A6E; line-height: 1.5;">
        Se ha registrado una reserva de sala en SASGE que requiere soporte técnico y suministro de <strong>Proyector y/o Laptop</strong>.
      </p>
    </div>

    <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 22px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 16px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
        📍 Información del Espacio y la Reunión
      </h3>
      <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
        <tr>
          <td style="padding: 6px 0; color: #64748B; width: 35%;"><strong>Espacio / Sala:</strong></td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${roomName} ${roomFloor}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;"><strong>Fecha:</strong></td>
          <td style="padding: 6px 0; color: #0F172A; font-weight: 700;">${formattedDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;"><strong>Horario:</strong></td>
          <td style="padding: 6px 0; color: #0284C7; font-weight: 700;">${timeVal}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;"><strong>Motivo / Asunto:</strong></td>
          <td style="padding: 6px 0; color: #0F172A;">${request.title}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;"><strong>Funcionario Responsable:</strong></td>
          <td style="padding: 6px 0; color: #0F172A;">${organizerName}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;"><strong>Dependencia:</strong></td>
          <td style="padding: 6px 0; color: #0F172A;">${dependency}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748B;"><strong>Teléfono de Contacto:</strong></td>
          <td style="padding: 6px 0; color: #0F172A;">${contactPhone}</td>
        </tr>
      </table>
    </div>

    <div style="background-color: #F0F9FF; border: 1px solid #BAE6FD; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
      <h3 style="margin-top: 0; margin-bottom: 14px; font-size: 15px; color: #0369A1; font-weight: 800;">
        💻 Equipos Tecnológicos Solicitados:
      </h3>
      <ul style="margin: 0; padding-left: 0; list-style: none;">
        ${techItemsHtml}
      </ul>
    </div>

    <p style="font-size: 13px; color: #64748B; margin-top: 20px; line-height: 1.5;">
      Agradecemos al equipo de TIC coordinar el alistamiento, instalación o verificación previa de los equipos en la sala con antelación al inicio de la jornada.
    </p>

    <div style="text-align: center; margin-top: 25px;">
      <a href="https://sasge.secretariajuridica.gov.co/admin/manage" 
         style="background-color: #0284C7; color: #FFFFFF; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
        Ver Solicitud en SASGE
      </a>
    </div>
  `;

  const htmlContent = getHtmlTemplate(
    'Requerimiento de Equipos TIC',
    bodyContent,
    'rooms'
  );

  try {
    const toList = normalizeRecipients(ticEmail);
    if (toList.length === 0) {
      console.warn('⚠️ [TIC EMAIL] Sin destinatarios válidos para sendTicRoomNotification');
      return;
    }
    const toRecipients = toList.length === 1 ? toList[0] : toList;
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: toRecipients,
      subject: subject,
      html: htmlContent
    });
    console.log(`📧 [TIC] Notificación de equipos para sala enviada a: ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients}`);
  } catch (error) {
    console.error(`Error al enviar notificación a TIC (${ticEmail}):`, error);
  }
}

/**
 * Envía correo a los encargados/aprobadores (service_emails) informando que se radicó una nueva solicitud
 */
async function sendAdminNewRequestNotification(adminEmails, request, user) {
  const toList = normalizeRecipients(adminEmails);
  if (toList.length === 0) {
    console.warn('⚠️ [ADMIN EMAIL] Sin destinatarios válidos para sendAdminNewRequestNotification');
    return;
  }
  const toRecipients = toList.length === 1 ? toList[0] : toList;

  const categoryName = CATEGORIES[request.category?.toLowerCase()] || request.category;
  const radNumber = request.id ? `#${String(request.id).slice(0, 6).toUpperCase()}` : '';
  const subject = `SASGE: Nueva Solicitud Radicada - ${categoryName} ${radNumber} - ${request.title}`;
  
  const requesterName = user?.name || user?.full_name || request.user_name || 'Funcionario';
  const requesterDep = user?.dependency || request.metadata?.dependency || 'Secretaría Jurídica Distrital';
  const { html: metadataHtml, attachments: emailAttachments } = formatMetadataForEmail(request);

  const htmlContent = getHtmlTemplate(
    'Nueva Solicitud Radicada',
    `
      <div style="background-color: #EFF6FF; border-left: 4px solid #2563EB; padding: 14px 18px; border-radius: 6px; margin-bottom: 20px;">
        <p style="margin: 0; font-size: 14px; color: #1E40AF; font-weight: 700;">
          📋 Nueva Solicitud en SASGE para Revisión / Aprobación
        </p>
        <p style="margin: 4px 0 0 0; font-size: 13px; color: #1E3A8A; line-height: 1.5;">
          Se ha radicado una nueva solicitud en el módulo de <strong>${categoryName}</strong> que requiere su gestión, validación o trámite correspondiente.
        </p>
      </div>

      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 20px; margin: 20px 0;">
        <h3 style="margin-top: 0; margin-bottom: 12px; font-size: 15px; color: #0F172A; border-bottom: 1px solid #E2E8F0; padding-bottom: 8px;">
          Ficha de la Solicitud
        </h3>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Radicado / ID:</strong> <span style="font-weight: 800; color: #0F172A;">${radNumber || 'Pendiente'}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Título:</strong> <span style="font-weight: 700; color: #0F172A;">${request.title}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Solicitante:</strong> ${requesterName}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Dependencia:</strong> ${requesterDep}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Prioridad:</strong> <span style="font-weight: 800; color: #2563EB;">${request.priority ? request.priority.toUpperCase() : 'NORMAL'}</span></p>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Fecha de Radicación:</strong> ${new Date(request.created_at || new Date()).toLocaleString('es-CO')}</p>
        <p style="margin: 6px 0; font-size: 14px;"><strong style="color: #64748B;">Descripción:</strong> ${request.description}</p>
        ${metadataHtml}
      </div>

      <p style="font-size: 13px; color: #64748B; margin-top: 15px;">
        Por favor ingresa al módulo de administración para revisar los detalles, aprobar o coordinar el trámite.
      </p>

      <div style="text-align: center; margin-top: 25px;">
        <a href="https://sasge.secretariajuridica.gov.co/admin/manage" 
           style="background-color: #0F172A; color: #FFFFFF; text-decoration: none; padding: 12px 26px; border-radius: 8px; font-weight: 700; font-size: 14px; display: inline-block;">
          Gestionar Solicitud en SASGE
        </a>
      </div>
    `,
    request.category
  );

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: toRecipients,
      subject: subject,
      html: htmlContent,
      attachments: emailAttachments
    });
    console.log(`📧 Correo de nueva solicitud enviado a encargados: ${Array.isArray(toRecipients) ? toRecipients.join(', ') : toRecipients}`);
  } catch (error) {
    console.error('Error al enviar correo de nueva solicitud a encargados:', error);
  }
}

module.exports = {
  sendRequestCreatedNotification,
  sendRequestUpdatedNotification,
  sendAdminServiceNotification,
  sendTicRoomNotification,
  sendAdminNewRequestNotification
};
