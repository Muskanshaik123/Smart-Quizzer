const nodemailer = require('nodemailer');

// Create email transporter with your Gmail configuration
const transporter = nodemailer.createTransporter({
    service: process.env.EMAIL_SERVICE || 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

// Verify email configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email configuration error:', error);
    } else {
        console.log('✅ Email server is ready to send messages');
    }
});

// Send verification email
async function sendVerificationEmail(userEmail, verificationToken, userName) {
    const verificationLink = `${process.env.APP_URL || 'http://localhost:5000'}/verify-email?token=${verificationToken}`;
    
    const mailOptions = {
        from: `"Adaptive Quiz Generator" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Verify Your Email - Adaptive Quiz Generator',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
                    .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #718096; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎯 Adaptive Quiz Generator</h1>
                        <p>Email Verification Required</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${userName}! 👋</h2>
                        <p>Thank you for registering with Adaptive Quiz Generator. To complete your registration and start creating amazing quizzes, please verify your email address.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${verificationLink}" class="button">Verify Email Address</a>
                        </div>
                        
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 5px; font-size: 12px;">
                            ${verificationLink}
                        </p>
                        
                        <p><strong>This verification link will expire in 24 hours.</strong></p>
                        
                        <p>If you didn't create an account with us, please ignore this email.</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Adaptive Quiz Generator. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Verification email sent to: ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending verification email:', error);
        return false;
    }
}

// Send password reset email
async function sendPasswordResetEmail(userEmail, resetToken, userName) {
    const resetLink = `${process.env.APP_URL || 'http://localhost:5000'}/reset-password?token=${resetToken}`;
    
    const mailOptions = {
        from: `"Adaptive Quiz Generator" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Reset Your Password - Adaptive Quiz Generator',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
                    .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #f59e0b 0%, #ef4444 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold; }
                    .footer { text-align: center; margin-top: 20px; color: #718096; font-size: 12px; }
                    .warning { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎯 Adaptive Quiz Generator</h1>
                        <p>Password Reset Request</p>
                    </div>
                    <div class="content">
                        <h2>Hello ${userName}! 👋</h2>
                        <p>We received a request to reset your password for your Adaptive Quiz Generator account.</p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${resetLink}" class="button">Reset Password</a>
                        </div>
                        
                        <p>Or copy and paste this link in your browser:</p>
                        <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 5px; font-size: 12px;">
                            ${resetLink}
                        </p>
                        
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong></p>
                            <p>This password reset link will expire in 1 hour.</p>
                            <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
                        </div>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Adaptive Quiz Generator. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Password reset email sent to: ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending password reset email:', error);
        return false;
    }
}

// Send welcome email after verification
async function sendWelcomeEmail(userEmail, userName) {
    const mailOptions = {
        from: `"Adaptive Quiz Generator" <${process.env.EMAIL_USER}>`,
        to: userEmail,
        subject: 'Welcome to Adaptive Quiz Generator! 🎉',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); padding: 30px; text-align: center; color: white; border-radius: 10px 10px 0 0; }
                    .content { background: #f7fafc; padding: 30px; border-radius: 0 0 10px 10px; }
                    .feature { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #4ade80; }
                    .footer { text-align: center; margin-top: 20px; color: #718096; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🎯 Adaptive Quiz Generator</h1>
                        <p>Welcome Aboard! 🚀</p>
                    </div>
                    <div class="content">
                        <h2>Welcome, ${userName}! 👋</h2>
                        <p>Your email has been successfully verified and your account is now active!</p>
                        
                        <p>Get ready to experience personalized learning with our AI-powered quiz platform:</p>
                        
                        <div class="feature">
                            <strong>🤖 AI-Powered Quiz Generation</strong>
                            <p>Create quizzes automatically from any content - PDFs, text, or URLs</p>
                        </div>
                        
                        <div class="feature">
                            <strong>🎯 Adaptive Learning</strong>
                            <p>Questions adjust to your skill level automatically</p>
                        </div>
                        
                        <div class="feature">
                            <strong>📊 Progress Tracking</strong>
                            <p>Monitor your learning journey with detailed analytics</p>
                        </div>
                        
                        <div class="feature">
                            <strong>🏆 Earn Certificates</strong>
                            <p>Get certified for your achievements and progress</p>
                        </div>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #4ade80 0%, #22c55e 100%); color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                Start Your Learning Journey
                            </a>
                        </div>
                        
                        <p>If you have any questions, feel free to reply to this email.</p>
                        
                        <p>Happy Learning!<br>The Adaptive Quiz Generator Team</p>
                    </div>
                    <div class="footer">
                        <p>&copy; 2024 Adaptive Quiz Generator. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`✅ Welcome email sent to: ${userEmail}`);
        return true;
    } catch (error) {
        console.error('❌ Error sending welcome email:', error);
        return false;
    }
}

module.exports = {
    sendVerificationEmail,
    sendPasswordResetEmail,
    sendWelcomeEmail,
    transporter
};