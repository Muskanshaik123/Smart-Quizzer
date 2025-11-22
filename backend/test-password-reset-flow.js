// Complete test of password reset flow
const fetch = require('node-fetch');

const API_BASE_URL = 'http://localhost:5000/api';
const TEST_EMAIL = 'shaikmuskan471@gmail.com';
const NEW_PASSWORD = 'newpassword123';

async function testPasswordResetFlow() {
    console.log('🧪 Testing Complete Password Reset Flow\n');
    
    try {
        // Step 1: Request password reset
        console.log('📧 Step 1: Requesting password reset...');
        const forgotResponse = await fetch(`${API_BASE_URL}/forgot-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_EMAIL })
        });
        
        const forgotData = await forgotResponse.json();
        console.log('Response:', forgotData);
        
        if (!forgotData.success) {
            console.log('❌ Failed to request password reset');
            return;
        }
        
        console.log('✅ Password reset requested successfully');
        
        if (forgotData.resetLink) {
            console.log('\n🔗 Reset Link:', forgotData.resetLink);
            
            // Extract token from reset link
            const url = new URL(forgotData.resetLink);
            const token = url.searchParams.get('token');
            const email = url.searchParams.get('email');
            
            console.log('\n🔑 Token:', token);
            console.log('📧 Email:', email);
            
            // Step 2: Reset password with token
            console.log('\n🔐 Step 2: Resetting password...');
            const resetResponse = await fetch(`${API_BASE_URL}/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    token: token,
                    newPassword: NEW_PASSWORD
                })
            });
            
            const resetData = await resetResponse.json();
            console.log('Response:', resetData);
            
            if (resetData.success) {
                console.log('\n✅ Password reset successful!');
                console.log('💡 You can now login with:');
                console.log(`   Email: ${email}`);
                console.log(`   Password: ${NEW_PASSWORD}`);
            } else {
                console.log('\n❌ Password reset failed:', resetData.error);
            }
        } else {
            console.log('\n⚠️  No reset link in response (email might be sent instead)');
        }
        
    } catch (error) {
        console.error('\n❌ Error during test:', error.message);
        console.log('\n💡 Make sure the server is running: node backend/server.js');
    }
}

// Run the test
testPasswordResetFlow();
