import { Devvit, useState, useChannel, useInterval, useAsync } from '@devvit/public-api';
import { DECK } from './deck.js';
import { getCardName, getLastFiveCards, getCard, shuffle, calcPlus, calcScore } from './utilities.js';

const DEBOUNCE_DELAY = 1000; 

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
  postId: string;
};

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

export interface Props {
  navigate: (page: PageType) => void;
  setCount: (count: number) => void;
  count: number;
  setCard: (card: string) => void;
  currCard: string;
  setCards: (drawnCards: string[]) => void;
  drawnCards: string[];
  setTotal: (totalCurrCards: number) => void;
  totalCurrCards: number;
  setDeck: (currDeck: string[]) => void;
  currDeck: string[];
  setPlus: (plus: number) => void;
  plus: number;
  setScore: (score: number) => void;
  score: number;
  setReset: (reset: boolean) => void;
  reset: boolean;
  setMaxTotal: (maxTotal: number) => void;
  maxTotal: number;
  setLastClickTime: (lastClickTime: number) => void;
  lastClickTime: number;
  setIsDebouncing: (isDebouncing: boolean) => void;
  isDebouncing: boolean;
  handleClick: () => Promise<void>;
}

enum PageType {
  HOMEPAGE,
  COUNTPAGE,
}

const App: Devvit.CustomPostComponent = (context: Devvit.Context) => {
  const [page, navigate] = useState(PageType.HOMEPAGE);
  const [count, setCount] = useState(0);

  const [currCard, setCard] = useState('back.png');
  const [drawnCards, setCards] = useState<string[]>([]);;
  const [totalCurrCards, setTotal] = useState(0);
  const [currDeck, setDeck] = useState(shuffle([...DECK]));
  const [plus, setPlus] = useState(1);
  const [score, setScore] = useState(0);
  const [reset, setReset] = useState(false);
  const [maxTotal, setMaxTotal] = useState(0);

  const [lastClickTime, setLastClickTime] = useState(0);
  const [isDebouncing, setIsDebouncing] = useState(false);

  const channel = useChannel<RealtimeMessage>({
    name: 'events',
    onMessage: (msg) => {
      if (msg.session === mySession || msg.postId !== myPostId) {
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

  const handleClick = async () => {
    const now = Date.now();
    setLastClickTime(now);
    setIsDebouncing(true);
    
    // Logic for drawing a card
    const { updatedCard, updatedDeck, updatedDrawnCards, updatedTotal, updatedScore, updatedReset, updatedMax } = getCard(currDeck, drawnCards, totalCurrCards, score, reset, maxTotal);
    setScore(updatedScore);
    const payload: Payload = { card: updatedCard, drawnCards: updatedDrawnCards, totalCurrCards: updatedTotal, currDeck: updatedDeck, plus: calcPlus(updatedTotal), reset: updatedReset, maxTotal: updatedMax};
    const message: RealtimeMessage = { payload, session: mySession, postId: myPostId };

    // Send the message with the payload
    await channel.send(message);
  };

  const props: Props = {
    navigate,
    setCount,
    count,
    currCard,
    setCard,
    drawnCards,
    setCards,
    totalCurrCards,
    setTotal,
    currDeck,
    setDeck,
    plus,
    setPlus,
    score,
    setScore,
    reset,
    setReset,
    maxTotal,
    setMaxTotal,
    isDebouncing,
    setIsDebouncing,
    lastClickTime,
    setLastClickTime,
    handleClick,
  };

  const { postId } = context;
  const mySession = sessionId();
  const myPostId = postId ?? 'defaultPostId'; 



  if (page === PageType.COUNTPAGE) {
    return <CountPage {...props} />;
  } else {
    return <HomePage {...props} />;
  }
};

const HomePage: Devvit.BlockComponent<Props> = ({ navigate, currCard, setCard, drawnCards, setCards, totalCurrCards, setTotal, currDeck, setDeck,
  plus, setPlus, score, setScore, reset, setReset, maxTotal, setMaxTotal, isDebouncing, setIsDebouncing, lastClickTime, setLastClickTime, handleClick}, context) => {
  const countPage: Devvit.Blocks.OnPressEventHandler = () => {
    navigate(PageType.COUNTPAGE);
  };
  const { postId } = context;
  const mySession = sessionId();
  const myPostId = postId ?? 'defaultPostId'; 

  // Add delay to the button to avoid spamming
  const updateInterval = useInterval(() => {
    const now = Date.now();
    setIsDebouncing(now - lastClickTime <= DEBOUNCE_DELAY);
  }, 100).start();

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
          <button appearance='primary' onPress={countPage}>Leaderboard</button>
        </hstack>
      </vstack>
    </zstack>
  );
};

const CountPage: Devvit.BlockComponent<Props> = ({ navigate, setCount, count }) => {
  const incrementCount: Devvit.Blocks.OnPressEventHandler = () => {
    setCount(count+1);
  };

  const goToHomePage: Devvit.Blocks.OnPressEventHandler = () => {
    navigate(PageType.HOMEPAGE);
  };

  return (
    <vstack padding="medium" gap="medium" alignment="top center" cornerRadius="medium">
      <text size="xxlarge" weight="bold" grow>
        {'Press the button to add +1'}
      </text>
      <text>{count}</text>
      <vstack alignment="center bottom" gap="small">
        <button onPress={incrementCount} appearance="secondary">
          Count!
        </button>
        <button onPress={goToHomePage} appearance="primary">
          Back to Home
        </button>
      </vstack>
    </vstack>
  );
};

Devvit.addCustomPostType({
  name: 'Navigation and Counter App',
  description: 'Navigate between pages and count!',
  height: 'tall',
  render: App,
});

export default Devvit;