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

/**
 * Plantilla base de diseño premium para los correos
 */
function getHtmlTemplate(title, bodyContent) {
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
          background: linear-gradient(135deg, #023E8A 0%, #0077B6 100%);
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
          background-color: #0077B6;
          color: #FFFFFF !important;
          text-decoration: none;
          border-radius: 8px;
          font-weight: bold;
          font-size: 14px;
        }
        .highlight {
          font-weight: bold;
          color: #023E8A;
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
        .badge-rechazado { background-color: #FEE2E2; color: #DC2626; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Sistema de Administración de Servicios Generales 2.0</h1>
        </div>
        <div class="content">
          <h2 style="margin-top: 0; color: #0F172A;">${title}</h2>
          ${bodyContent}
        </div>
        <div class="footer">
          Este es un correo automático generado por el Sistema de Administración de Servicios Generales 2.0.<br>
          Alcaldía Mayor de Bogotá - Secretaría Jurídica Distrital.
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Envía correo al funcionario confirmando la creación de su solicitud
 */
async function sendRequestCreatedNotification(user, request) {
  const subject = `Sistema de Administración de Servicios Generales 2.0: Solicitud registrada exitosamente - ${request.title}`;
  
  const statusBadge = `<span class="badge badge-pendiente">Pendiente</span>`;
  
  const htmlContent = getHtmlTemplate(
    'Confirmación de Solicitud',
    `
      <p>Hola, <span class="highlight">${user.name}</span>.</p>
      <p>Tu solicitud de la categoría <span class="highlight">${request.category.toUpperCase()}</span> ha sido radicada correctamente en el Sistema de Administración de Servicios Generales 2.0.</p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <strong>Detalles de la Solicitud:</strong><br>
        <span class="highlight">Título:</span> ${request.title}<br>
        <span class="highlight">Descripción:</span> ${request.description}<br>
        <span class="highlight">Prioridad:</span> ${request.priority.toUpperCase()}<br>
        <span class="highlight">Estado Inicial:</span> ${statusBadge}<br>
        <span class="highlight">Fecha:</span> ${new Date(request.created_at).toLocaleString('es-CO')}
      </div>
      
      <p>El equipo de servicios generales revisará tu requerimiento y te notificará por este medio sobre cualquier actualización.</p>
    `
  );

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: subject,
      html: htmlContent
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
  const subject = `Sistema de Administración de Servicios Generales 2.0: Tu solicitud ha sido actualizada - Status: ${request.status.toUpperCase()}`;
  
  const statusBadge = `<span class="badge badge-${request.status}">${request.status.toUpperCase()}</span>`;
  
  let adminNotesSection = '';
  if (request.admin_notes) {
    adminNotesSection = `
      <div style="background-color: #FFFBEB; border: 1px solid #FCD34D; border-radius: 8px; padding: 15px; margin: 20px 0; color: #78350F;">
        <strong>Notas del Administrador / Observaciones:</strong><br>
        ${request.admin_notes}
      </div>
    `;
  }

  const htmlContent = getHtmlTemplate(
    'Actualización de Estado',
    `
      <p>Hola, <span class="highlight">${user.name}</span>.</p>
      <p>Te informamos que tu solicitud ha cambiado de estado.</p>
      
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 20px; margin: 20px 0;">
        <strong>Detalles de la Solicitud:</strong><br>
        <span class="highlight">Título:</span> ${request.title}<br>
        <span class="highlight">Nuevo Estado:</span> ${statusBadge}<br>
        <span class="highlight">Última Actualización:</span> ${new Date(request.updated_at).toLocaleString('es-CO')}
      </div>
      
      ${adminNotesSection}
      
      <p>Puedes ingresar al sistema en cualquier momento para ver más detalles.</p>
    `
  );

  try {
    await transporter.sendMail({
      from: FROM_EMAIL,
      to: user.email,
      subject: subject,
      html: htmlContent
    });
    console.log(`Correo de actualización enviado a: ${user.email}`);
  } catch (error) {
    console.error('Error al enviar correo de actualización de solicitud:', error);
  }
}

module.exports = {
  sendRequestCreatedNotification,
  sendRequestUpdatedNotification
};
