import { Devvit, useState, useChannel, useInterval, useAsync} from '@devvit/public-api';
import { DECK, INSTRUCTION } from './deck.js';
import { getCardName, getLastFiveCards, getCard, shuffle, calcPlus, calcScore } from './utilities.js';

const DEBOUNCE_DELAY = 1000; 

type Payload = {
  currCard: string;
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
  postId: string;
}

enum PageType {
  HOMEPAGE,
  LEADERBOARD,
  RULES,
}

async function getUsernameFromId(context: Devvit.Context) {
  const user = await context.reddit.getUserById(context.userId ?? '');
  if (user) {
    return `${user.username}`;
  }
  return 'undefined';
}

async function getMemberScore(context: Devvit.Context, postId: string, username: string) {
  const score = await context.redis.zScore(`${postId}-leaderboard`, username);
  return score ?? 0;
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
 
  const postId = context.postId ?? 'defaultPostId';
  const mySession = sessionId();
  
  // data is a string
  const [data, setData] = useState(async () => {
    const postData = await context.redis.get(`${postId}`);
    const postScore = await context.redis.get(`${postId}-${context.userId}`);
    if (postData) {
      const postDataStr = JSON.parse(postData);
      setCard(postDataStr.currCard);
      setCards(postDataStr.drawnCards);
      setTotal(postDataStr.totalCurrCards);
      setDeck(postDataStr.currDeck);
      setPlus(postDataStr.plus);
      setReset(postDataStr.reset);
      setMaxTotal(postDataStr.maxTotal);
      const username = await getUsernameFromId(context);
      const score = await getMemberScore(context, postId, username);
      setScore(score);
      return postData;
    }
    else{
      return JSON.stringify({
        currCard: 'back.png',
        drawnCards: [],
        totalCurrCards: 0,
        currDeck: shuffle([...DECK]),
        plus: 1,
        score: 0,
        reset: false,
        maxTotal: 0})
    }
  });

  async function setPostData(pcurrCard: string, pdrawnCards: string[], ptotalCurrCards: number, pcurrDeck: string[], pplus: number, preset: boolean, pmaxTotal: number, pscore: number) {
    const data = JSON.stringify({
      currCard: pcurrCard,
      drawnCards: pdrawnCards,
      totalCurrCards: ptotalCurrCards,
      currDeck: pcurrDeck,
      plus: pplus,
      reset: preset,
      maxTotal: pmaxTotal,
    })  
    await context.redis.set(`${postId}`, data);
    const username = await getUsernameFromId(context);
    await context.redis.zAdd(`${postId}-leaderboard`, { member: username, score: pscore });
  }

  const channel = useChannel<RealtimeMessage>({
    name: 'events',
    onMessage: (msg) => {
      if (msg.session === mySession || msg.postId !== postId) {
        //Ignore my updates b/c they have already been rendered
        return;
      }
      const payload = msg.payload;
      setCard(payload.currCard);
      setCards(payload.drawnCards);
      setTotal(payload.totalCurrCards);
      setDeck([...payload.currDeck]);
      setPlus(payload.plus);
      setReset(payload.reset);
      setMaxTotal(payload.maxTotal);
    },
  });
  
  channel.subscribe();

  const handleClick = async ()=> {
    const now = Date.now();
    setLastClickTime(now);
    setIsDebouncing(true);
    
    // Logic for drawing a card
    const { updatedCard, updatedDeck, updatedDrawnCards, updatedTotal, updatedScore, updatedReset, updatedMax } = getCard(currDeck, drawnCards, totalCurrCards, score, reset, maxTotal);
    setScore(updatedScore);
    const payload: Payload = { currCard: updatedCard, drawnCards: updatedDrawnCards, totalCurrCards: updatedTotal, currDeck: updatedDeck, plus: calcPlus(updatedTotal), reset: updatedReset, maxTotal: updatedMax };
    const message: RealtimeMessage = { payload, session: mySession, postId };
    
    // Send the message with the payload
    await channel.send(message);
    await setPostData(
      payload.currCard, 
      payload.drawnCards, 
      payload.totalCurrCards, 
      payload.currDeck, 
      payload.plus, 
      payload.reset, 
      payload.maxTotal, 
      updatedScore 
    );
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
    postId,
  };

  if (page === PageType.LEADERBOARD) {
    return <Leaderboard {...props} />;
  } else if (page === PageType.RULES) {
    return <Rules {...props} />;
  }
  else{
    return <HomePage {...props} />;
  }
};

const HomePage: Devvit.BlockComponent<Props> = ({ navigate, currCard, setCard, drawnCards, setCards, totalCurrCards, setTotal, currDeck, setDeck,
  plus, setPlus, score, setScore, reset, setReset, maxTotal, setMaxTotal, isDebouncing, setIsDebouncing, lastClickTime, setLastClickTime, handleClick, postId }, context) => {
  
  const leaderboard: Devvit.Blocks.OnPressEventHandler = () => {
    navigate(PageType.LEADERBOARD);
  };

  const rules: Devvit.Blocks.OnPressEventHandler = () => {
    navigate(PageType.RULES);
  };

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
          <button appearance='primary' onPress={rules}>Rules</button>
          <button onPress={handleClick} disabled={isDebouncing} appearance='primary'>
            Draw!
          </button>
          <button appearance='primary' onPress={leaderboard}>Leaderboard</button>
        </hstack>
      </vstack>
    </zstack>
  );
};

const Leaderboard: Devvit.BlockComponent<Props> = ({ navigate, postId }, context) => {
  
  const goToHomePage: Devvit.Blocks.OnPressEventHandler = () => {
    navigate(PageType.HOMEPAGE);
  };

  const { data: leaderboard, loading } = useAsync(async () => {
    return await context.redis.zRange(`${postId}-leaderboard`, -Infinity, +Infinity, { 
      reverse: true, 
      by: 'score' 
    });
  });

  if (loading) {
    return (
      <zstack height='100%' width='100%'>
        <image 
          url='background.png'
          imageHeight={512}
          imageWidth={720}
          resizeMode='cover'
        />
        <vstack height='100%' width='100%' alignment='center middle'>
          <text color='black' size='xxlarge'>Loading leaderboard... 🏆</text>
        </vstack>
      </zstack>
    );
  }

  if (leaderboard === null || leaderboard.length === 0) {
    return (
      <zstack height='100%' width='100%'>
        <image 
          url='background.png'
          imageHeight={512}
          imageWidth={720}
          resizeMode='cover'
        />
        <vstack alignment='center middle' height='100%' width='100%'>
          <text color='black' size="xxlarge">Leaderboard</text>
          <text color='black'>No one explodes yet 😃😃😃</text>
          <button onPress={goToHomePage} icon='close' appearance='primary'></button>
        </vstack>
      </zstack>
    )
  }

  return (
    <zstack height='100%' width='100%'>
      <image 
        url='background.png'
        imageHeight={512}
        imageWidth={720}
        resizeMode='cover'
      />
      <vstack gap="small" alignment='center middle' height='100%' width='100%'>
        <text color='black' size="xlarge">Leaderboard</text>
        <vstack 
          gap="small" 
          border='thick' 
          borderColor="black" 
          cornerRadius="small"
        >
          <hstack gap="medium" padding="small">
            <text color='black' style="heading" size="small" grow>Rank</text>
            <text color='black' style="heading" size="small" grow>Username</text>
            <text color='black' style="heading" size="small" grow>Score</text>
          </hstack>
          {leaderboard.map((entry, index) => (
            <hstack key={entry.member} gap="medium" padding="small" >
              <text color='black' grow>{index + 1}</text>
              <text color='black' grow>{entry.member}</text>
              <text color='black' grow>{entry.score}</text>
            </hstack>
          ))}
        </vstack>
        <button onPress={goToHomePage} icon='close' appearance='primary'></button>
      </vstack>
    </zstack>
  )
};

const Rules: Devvit.BlockComponent<Props> = ({ navigate }, context) => {
  
  const goToHomePage: Devvit.Blocks.OnPressEventHandler = () => {
    navigate(PageType.HOMEPAGE);
  };

  const [currentIndex, setCurrentIndex] = useState(0);

  const moveForward = () => {
    if (currentIndex < INSTRUCTION.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const moveBackward = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  return (
    <zstack height='100%' width='100%'>
      <image 
        url='background.png'
        imageHeight={512}
        imageWidth={720}
        resizeMode='cover'
      />

      <vstack gap="medium" height='100%' width='100%' alignment='center middle'>
        <image 
          url={INSTRUCTION[currentIndex]}
          description="instruction"
          imageHeight={384}
          imageWidth={384}
          height="300px"
          width="300px"
        />
        <hstack gap="medium">
          <button 
            onPress={moveBackward} 
            disabled={currentIndex === 0}
            icon='caret-left'
            appearance='primary'
          >
          </button>
          <button 
            onPress={moveForward} 
            disabled={currentIndex === INSTRUCTION.length - 1}
            icon='caret-right'
            appearance='primary'
          >
          </button>
        </hstack>
        <button onPress={goToHomePage} appearance='primary' icon='close'></button>
      </vstack>
    </zstack>
  );
};

// Create a post daily at 12:00 UTC
Devvit.addSchedulerJob({
  name: 'daily_exploding_deck',
  onRun: async (event, context) => {
    const subreddit = await context.reddit.getCurrentSubreddit();
    await context.reddit.submitPost({
      subredditName: subreddit.name,
      title: `Daily EXPLODING DECK 💣🃏 - ${new Date().toDateString()}`,
      preview: (
        <vstack>
          <text>Wait til loading finishes, then explode. 💣💣💣</text>
        </vstack>
      ),
    });
  },
});

Devvit.addTrigger({
  event: 'AppInstall',
  onEvent: async (event, context) => {
    try {
      const jobId = await context.scheduler.runJob({
        name: 'daily_exploding_deck',
        cron: '0 12 * * *', 
      });
      await context.redis.set('dailyExplodingDeckJobId', jobId);
    } catch (e) {
      console.log('Error scheduling daily Exploding Deck post:', e);
    }
  },
});


Devvit.addCustomPostType({
  name: 'EXPLODING DECK 💣🃏',
  description: 'Having fun and exploding!!!',
  height: 'tall',
  render: App,
});

Devvit.addMenuItem({
  label: 'New Game',
  location: 'subreddit',
  onPress: async (_, { reddit, ui }) => {
    const subreddit = await reddit.getCurrentSubreddit();

    /*
     * Submits the custom post to the specified subreddit
     */
    await reddit.submitPost({
      // This will show while your custom post is loading
      preview: (
        <vstack alignment='center middle'>
          <text style="heading" size="medium">
          Wait til loading finishes, then explode. 💣💣💣
          </text>
        </vstack>
      ),
      title: `EXPLODING DECK`,
      subredditName: subreddit.name,
    });

    ui.showToast({
      text: `Successfully created an Exploding Deck!`,
      appearance: 'success',
    });
  },
});

export default Devvit;