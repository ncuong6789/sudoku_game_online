/**
 * Z AI Module
 * Interface to Z AI API for game move suggestions
 */

const Z_API_BASE_URL = 'https://api.z.ai/api/coding/paas/v4/';

async function callZAI(messages, apiKey) {
    if (!apiKey) {
        console.error('[Z AI] No API key configured');
        return null;
    }

    try {
        const response = await fetch(Z_API_BASE_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'default',
                messages: messages,
                max_tokens: 1000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Z AI] API Error: ${response.status}`, errorText);
            return null;
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    } catch (error) {
        console.error('[Z AI] Request failed:', error.message);
        return null;
    }
}

async function getBestMoveFromZAI(gameState, apiKey) {
    const systemMessage = {
        role: 'system',
        content: `You are a Jungle Chess (Cờ Thú) AI. The board is 7x9. Animals: 1=Rat, 2=Cat, 3=Dog, 4=Wolf, 5=Leopard, 6=Tiger, 7=Lion, 8=Elephant.
You play as Player 2 (top side, moves first). Return ONLY a JSON object with your move in this exact format:
{"from": {"x": col, "y": row}, "to": {"x": col, "y": row}}

The board coordinates: x=0-6 (left to right), y=0-8 (top to bottom). Player 2 is at top (y=0-2 initially), Player 1 is at bottom (y=6-8 initially).
Rivers are at rows y=3,4,5 and columns x=1,2,4,5. Tigers/Lions can jump over rivers. Rats can swim.`
    };

    const userMessage = {
        role: 'user',
        content: `Current pieces on board:\n${gameState.pieces.map(p => 
            `Type ${p.type} (${['Rat','Cat','Dog','Wolf','Leopard','Tiger','Lion','Elephant'][p.type-1]}) at (${p.x},${p.y}) owner ${p.ownerId === 'CPU' ? 'Player2' : 'Player1'}`
        ).join('\n')}

Turn: ${gameState.turn === 'CPU' ? 'Your turn (Player 2)' : 'Player 1\'s turn'}

What is your best move?`
    };

    const result = await callZAI([systemMessage, userMessage], apiKey);
    
    if (!result) return null;

    try {
        const move = JSON.parse(result);
        if (move.from && move.to) return move;
    } catch (e) {
        const match = result.match(/\{[^}]+\}/);
        if (match) {
            try {
                return JSON.parse(match[0]);
            } catch (e2) {}
        }
    }
    
    return null;
}

module.exports = { getBestMoveFromZAI };