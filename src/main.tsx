// Learn more at developers.reddit.com/docs
import { Devvit, useState, useChannel, useInterval } from '@devvit/public-api';
import { DECK } from './deck.js';
import { getCardName, getLastFiveCards, getCard, shuffle, calcPlus, calcScore } from './utilities.js';

type Payload = {
  card: string;
  drawnCards: string[];
  totalCurrCards: number;
  currDeck: string[];
  plus: number;
  reset: boolean;
  maxTotal: number;
};

type RealtimeMessage = {
  payload: Payload;
  session: string;
  // avoid losing data after reloading
  // postId: string;
};

type PageProps = {
  setPage: (page: string) => void;
}

function sessionId(): string {
  let id = '';
  const asciiZero = '0'.charCodeAt(0);
  for (let i = 0; i < 4; i++) {
    id += String.fromCharCode(Math.floor(Math.random() * 26) + asciiZero);
  }
  return id;
}

Devvit.configure({
  redditAPI: true,
  realtime: true,
  redis: true,
});

const mainPage = ({ setPage }: PageProps) => {
  const mySession = sessionId();
    // const [currCard, setCard] = useState(async () => {
    //   const cardData = await redis.get(myPostId);
    //   if (cardData) {
    //     return cardData;
    //   }
    //   return 'back.png';
    // });
  const [currCard, setCard] = useState('back.png');
  const [drawnCards, setCards] = useState<string[]>([]);;
  const [totalCurrCards, setTotal] = useState(0);
  const [currDeck, setDeck] = useState(shuffle([...DECK]));
  const [plus, setPlus] = useState(1);
  const [score, setScore] = useState(0);
  const [reset, setReset] = useState(false);
  const [maxTotal, setMaxTotal] = useState(0);
  

  // Variables for delaying the button
  const [lastClickTime, setLastClickTime] = useState(0);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const DEBOUNCE_DELAY = 1000; 
  
  const lockKey = 'button_lock';
  const lockDuration = 5000;

  const channel = useChannel<RealtimeMessage>({
    name: 'events',
    onMessage: (msg) => {
      // if (msg.session === mySession || msg.postId !== myPostId) {
      if (msg.session === mySession) {
        //Ignore my updates b/c they have already been rendered
        return;
      }
      const payload = msg.payload;
      setCard(payload.card);
      setCards(payload.drawnCards);
      setTotal(payload.totalCurrCards);
      setDeck([...payload.currDeck]);
      setPlus(payload.plus);
      setReset(payload.reset);
      setMaxTotal(payload.maxTotal);
    },
  });

  channel.subscribe();


  // Add delay to the button to avoid spamming
  const updateInterval = useInterval(() => {
    const now = Date.now();
    setIsDebouncing(now - lastClickTime <= DEBOUNCE_DELAY);
  }, 100).start();

  const handleClick = async () => {
    const now = Date.now();
    setLastClickTime(now);
    setIsDebouncing(true);
    
    // Logic for drawing a card
    const { updatedCard, updatedDeck, updatedDrawnCards, updatedTotal, updatedScore, updatedReset, updatedMax } = getCard(currDeck, drawnCards, totalCurrCards, score, reset, maxTotal);
    setScore(updatedScore);
    const payload: Payload = { card: updatedCard, drawnCards: updatedDrawnCards, totalCurrCards: updatedTotal, currDeck: updatedDeck, plus: calcPlus(updatedTotal), reset: updatedReset, maxTotal: updatedMax};
    const message: RealtimeMessage = { payload, session: mySession };

    // Send the message with the payload
    await channel.send(message);
  };
  return (
    <zstack width='100%' height='100%'>
      <image 
      url='background.png'
      imageHeight={512}
      imageWidth={720}
      resizeMode='cover'
      />
      
      <vstack height="100%" width="100%" gap="medium" alignment="center middle">
        <image
          url={currCard?.toString() || 'back.png'}
          description="card"
          imageHeight={384}
          imageWidth={384}
          height="300px"
          width="300px"
        />

        <text size="large" color='black'>Remaining cards: {currDeck.length}</text>
        <text size="large" color='black'>Total current cards: {totalCurrCards} - Plus: {calcPlus(totalCurrCards)}</text>
        <text color='black' size="large">{`Last 5 cards: ${getLastFiveCards(drawnCards)}`}</text>
        <text color='black' size="xxlarge">{`Score: ${score}`}</text>
        <hstack gap='medium'>
          <button appearance='primary'>Rules</button>
          <button onPress={handleClick} disabled={isDebouncing} appearance='primary'>
            Draw!
          </button>
          <button appearance='primary'>Leaderboard</button>
        </hstack>
      </vstack>
    </zstack>
  )
  
};


// Add a menu item to the subreddit menu for instantiating the new experience post
Devvit.addMenuItem({
  label: 'Add new game',
  location: 'subreddit',
  forUserType: 'moderator',
  onPress: async (_event, context) => {
    const { reddit, ui } = context;
    const subreddit = await reddit.getCurrentSubreddit();
    await reddit.submitPost({
      title: 'EXPLODING DECK 💣🃏',
      subredditName: subreddit.name,
      // The preview appears while the post loads
      preview: (
        <vstack height="100%" width="100%" alignment="middle center">
          <text size="large">Loading ...</text>
        </vstack>
      ),
    });
    ui.showToast({ text: 'Created post!' });
  },
});

// Add a post type definition
Devvit.addCustomPostType({
  name: 'Experience Post',
  height: 'tall',
  render: (_context) => {
    // const {redis, postId} = _context;
    // const myPostId = postId ?? 'defaultPostId';
    const mySession = sessionId();
    // const [currCard, setCard] = useState(async () => {
    //   const cardData = await redis.get(myPostId);
    //   if (cardData) {
    //     return cardData;
    //   }
    //   return 'back.png';
    // });
    const [currCard, setCard] = useState('back.png');
    const [drawnCards, setCards] = useState<string[]>([]);;
    const [totalCurrCards, setTotal] = useState(0);
    const [currDeck, setDeck] = useState(shuffle([...DECK]));
    const [plus, setPlus] = useState(1);
    const [score, setScore] = useState(0);
    const [reset, setReset] = useState(false);
    const [maxTotal, setMaxTotal] = useState(0);
    

    // Variables for delaying the button
    const [lastClickTime, setLastClickTime] = useState(0);
    const [isDebouncing, setIsDebouncing] = useState(false);
    const DEBOUNCE_DELAY = 1000; 
    
    const lockKey = 'button_lock';
    const lockDuration = 5000;

    const channel = useChannel<RealtimeMessage>({
      name: 'events',
      onMessage: (msg) => {
        // if (msg.session === mySession || msg.postId !== myPostId) {
        if (msg.session === mySession) {
          //Ignore my updates b/c they have already been rendered
          return;
        }
        const payload = msg.payload;
        setCard(payload.card);
        setCards(payload.drawnCards);
        setTotal(payload.totalCurrCards);
        setDeck([...payload.currDeck]);
        setPlus(payload.plus);
        setReset(payload.reset);
        setMaxTotal(payload.maxTotal);
      },
    });

    channel.subscribe();


    // Add delay to the button to avoid spamming
    const updateInterval = useInterval(() => {
      const now = Date.now();
      setIsDebouncing(now - lastClickTime <= DEBOUNCE_DELAY);
    }, 100).start();
  
    const handleClick = async () => {
      const now = Date.now();
      setLastClickTime(now);
      setIsDebouncing(true);
      
      // Logic for drawing a card
      const { updatedCard, updatedDeck, updatedDrawnCards, updatedTotal, updatedScore, updatedReset, updatedMax } = getCard(currDeck, drawnCards, totalCurrCards, score, reset, maxTotal);
      setScore(updatedScore);
      const payload: Payload = { card: updatedCard, drawnCards: updatedDrawnCards, totalCurrCards: updatedTotal, currDeck: updatedDeck, plus: calcPlus(updatedTotal), reset: updatedReset, maxTotal: updatedMax};
      const message: RealtimeMessage = { payload, session: mySession };

      // Send the message with the payload
      await channel.send(message);
    };

    return (

      <zstack width='100%' height='100%'>
        <image 
        url='background.png'
        imageHeight={512}
        imageWidth={720}
        resizeMode='cover'
        />
        
        <vstack height="100%" width="100%" gap="medium" alignment="center middle">
          <image
            url={currCard?.toString() || 'back.png'}
            description="card"
            imageHeight={384}
            imageWidth={384}
            height="300px"
            width="300px"
          />

          <text size="large" color='black'>Remaining cards: {currDeck.length}</text>
          <text size="large" color='black'>Total current cards: {totalCurrCards} - Plus: {calcPlus(totalCurrCards)}</text>
          <text color='black' size="large">{`Last 5 cards: ${getLastFiveCards(drawnCards)}`}</text>
          <text color='black' size="xxlarge">{`Score: ${score}`}</text>
          <hstack gap='medium'>
            <button appearance='primary'>Rules</button>
            <button onPress={handleClick} disabled={isDebouncing} appearance='primary'>
              Draw!
            </button>
            <button appearance='primary'>Leaderboard</button>
          </hstack>
        </vstack>
      </zstack>
    
    );
  },
});

export default Devvit;
