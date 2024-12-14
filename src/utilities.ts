import { DECK, COLOR } from './deck.js';


let maxTotal = 0;

// let reset = false;

// return the name of the card 
export function getCardName(cardImg: any): string{
    const match = cardImg.match(/^(\w+)_(\d+)\.png$/);
    if (match){
        const color = match[1].charAt(0).toUpperCase();
        const num = match[2];
        return `${num}${color}`;
    }
    if (cardImg == 'back1.png'){
        return 'back 1 ';
    }
    if (cardImg == 'high.png'){
        return 'total -> ';
    }
    if (cardImg == 'draw3.png'){
        return 'draw 3';
    }
    if (cardImg == 'x.png'){
        return 'X';
    }
    if (cardImg == 'explosion.png'){
        return 'BOOM!';
    }
    return '';
}

// get the last 5 cards
export function getLastFiveCards(drawnCards: String[]): string{
    return drawnCards.slice(-5).join(' - ');
}



export function shuffle(arr: string[]): string[] {
    let clone = arr.slice();
    let currInd = clone.length;
    while (currInd != 0) {
      let randInd = Math.floor(Math.random() * currInd);
      currInd--;
      [clone[currInd], clone[randInd]] = [clone[randInd], clone[currInd]];
    }
    return clone
  }

// Get all info after a card being drawn
export function getCard(currDeck: string[], drawnCards: string[], totalCurrCards: number, score: number, reset: boolean, maxTotal: number): 
{ updatedCard: string, updatedDeck: string[], updatedDrawnCards: string[], updatedTotal: number, updatedScore: number, updatedReset: boolean, updatedMax: number }{
    let drawn = currDeck.shift();
    let updatedMax = maxTotal;
    let updatedDrawnCards = [...drawnCards];
    if (drawn === undefined){
        const shuffledDeck = shuffle([...DECK]);
        currDeck.length = 0; 
        currDeck.push(...shuffledDeck);
        drawn = currDeck.shift();
    }
    else{
        if (drawn !== 'explosion.png'){
            // back 1
            if (drawn === 'back1.png'){
                if (drawnCards.length === 0){
                    updatedDrawnCards.push(getCardName(drawn) + '+0');
                }
                else{
                    const prevCard = drawnCards[drawnCards.length - 1];
                    const prevColor = prevCard.charAt(prevCard.length - 1);
                    if (COLOR.includes(prevColor)){
                        const prevVal = prevCard.slice(0,-1);
                        updatedDrawnCards.push(getCardName(drawn) + '+' + prevVal);
                        score += Number(prevVal);
                    }
                    else{
                        updatedDrawnCards.push(getCardName(drawn) + '+0');
                    }
                }
            }
            // high
            else if (drawn === 'high.png'){
                totalCurrCards = maxTotal;
                updatedDrawnCards.push(getCardName(drawn) + (maxTotal+1));
            }
            // X
            else if (drawn === 'x.png'){
                const num = Math.floor(Math.random() * 10) + 1;
                if (drawnCards.length === 0){
                    updatedDrawnCards.push(num + getCardName(drawn));
                }
                else{
                    const prevCard = drawnCards[drawnCards.length - 1];
                    const prevColor = prevCard.charAt(prevCard.length - 1);
                    if (COLOR.includes(prevColor)){
                        updatedDrawnCards.push(prevCard.slice(0,-1) + getCardName(drawn));
                    }
                    else{
                        updatedDrawnCards.push(num + getCardName(drawn));    
                    }
                }
            }
            // draw 3 cards
            else if (drawn == 'draw3.png'){
                updatedDrawnCards.push(getCardName(drawn));
                // draw 3 
                for (let i = 0; i < 3; i++){
                    let dr = currDeck.shift();
                    if (dr !== undefined){
                        updatedDrawnCards.push(getCardName(dr));
                    }
                    else{
                        const shuffledDeck = shuffle([...DECK]);
                        currDeck.length = 0; 
                        currDeck.push(...shuffledDeck); 
                        drawn = currDeck.shift();
                        updatedDrawnCards.push(getCardName(dr));
                    }
                    totalCurrCards += 1;
                }
                // calculate score based on the result
                const lastCard = updatedDrawnCards[updatedDrawnCards.length - 1];
                const secLastCard = updatedDrawnCards[updatedDrawnCards.length - 2];
                const thirdLastCard = updatedDrawnCards[updatedDrawnCards.length - 3];
                const lastC = lastCard.charAt(lastCard.length - 1);
                const secLastC = secLastCard.charAt(secLastCard.length - 1);
                const thirdLastC = thirdLastCard.charAt(thirdLastCard.length - 1);
                // not explode
                if (lastC !== secLastC && secLastC !== thirdLastC){
                    score += 10;
                }
            }
            // numbers
            else{
                updatedDrawnCards.push(getCardName(drawn));
            }
        }
        else{
            if (drawnCards.length == 0){
                updatedDrawnCards.push(getCardName(drawn));
            }
            else{
                const lastCard = updatedDrawnCards[updatedDrawnCards.length - 1];
                const lastColor = lastCard.charAt(lastCard.length - 1);
                if (COLOR.includes(lastColor)){
                    updatedDrawnCards.push(getCardName(drawn) + '/' + lastColor);
                }
                else{
                    updatedDrawnCards.push(getCardName(drawn));
                }
                
            }
        }
        if (reset){
            totalCurrCards = 0;
            reset = false;
        }
        totalCurrCards += 1;
        if (totalCurrCards > maxTotal){
            updatedMax = totalCurrCards;
        }
    }
    const plus = calcPlus(totalCurrCards);
    const { updatedScore, updatedReset } = calcScore(score, totalCurrCards, updatedDrawnCards, plus);
    return { updatedCard: drawn || '', updatedDeck: [...currDeck], updatedDrawnCards: updatedDrawnCards, updatedTotal: totalCurrCards, updatedScore: updatedScore, updatedReset: updatedReset, updatedMax: updatedMax};
}

export function calcPlus(totalCurrCards: number): number {
    return 1 + Math.floor(totalCurrCards / 5) * 0.5;
}

export function calcScore(score: number, totalCurrCards: number, drawnCards: string[], plus: number):
{updatedScore: number, updatedReset: boolean}{
    let updatedReset = false;
    if (totalCurrCards == 1){
        score += 1;
    }
    else if (drawnCards.length > 1){
        const lastCard = drawnCards[drawnCards.length - 1];
        const secLastCard = drawnCards[drawnCards.length - 2];
        const lastColor = lastCard.charAt(lastCard.length - 1);
        const secLastColor = secLastCard.charAt(secLastCard.length - 1);
        if (lastColor !== secLastColor){
            score += plus;
        }
        else if ((lastColor == secLastColor)){
            score -= totalCurrCards;
            updatedReset = true;
            plus = 1;
        }
    }
    return {updatedScore: score, updatedReset: updatedReset};
}

