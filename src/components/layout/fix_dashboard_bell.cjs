const fs = require('fs');

const targetFile = 'd:/ZahidCodes/TheSeeks-Dashboard/src/components/layout/TopBar.tsx';
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Replace playBellSound function
const oldPlayBell = `function playBellSound() {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime); 
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch(e){}
}`;

const newPlayBell = `function playBellSound() {
  try {
    const audio = new Audio('/Bell.mp3');
    audio.play().catch(e => console.warn('Could not play bell sound:', e));
  } catch(e) {
    console.warn('Audio play error:', e);
  }
}`;

content = content.replace(oldPlayBell, newPlayBell);

// 2. Replace the message snap listener logic to ignore self messages
const oldListener = `        if (newCount > 0 && snap.docs.length > 0) {
          playBellSound();
          if ('Notification' in window && Notification.permission === 'granted') {
            const latestData = snap.docs[0].data();
            new Notification(\`New Message in \${GROUP_NAMES[groupId] || groupId}\`, {
              body: \`\${latestData.sender || 'Unknown'}: \${latestData.text || ''}\`,
              icon: '/logo.png'
            });
          }
        }`;

const newListener = `        if (newCount > 0 && snap.docs.length > 0) {
          const latestData = snap.docs[0].data();
          const authMod = require('../../firebase').auth;
          const isMine = latestData.senderId === authMod?.currentUser?.uid || latestData.sender === 'Admin';
          
          if (!isMine) {
            playBellSound();
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(\`New Message in \${GROUP_NAMES[groupId] || groupId}\`, {
                body: \`\${latestData.sender || 'Unknown'}: \${latestData.text || ''}\`,
                icon: '/logo.png'
              });
            }
          }
        }`;

content = content.replace(oldListener, newListener);

fs.writeFileSync(targetFile, content);
console.log('Successfully updated TopBar.tsx in Dashboard app!');
