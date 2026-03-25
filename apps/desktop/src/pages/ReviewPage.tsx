import { useEffect, useState } from "react";
import styled, { css, keyframes } from "styled-components";
import { Button, Progress, Message, Loader } from "semantic-ui-react";
import PageContainer from "../components/templates/PageContainer";
import { useStore } from "../store";
import type { CardDetail } from "../lib/tauri/commands";
import * as commands from "../lib/tauri/commands";

const ReviewLayout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xl} 0;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const flipIn = keyframes`
  from { transform: rotateY(90deg); opacity: 0; }
  to { transform: rotateY(0deg); opacity: 1; }
`;

const FlipCard = styled.div<{ flipped: boolean }>`
  width: 480px;
  min-height: 200px;
  padding: ${({ theme }) => theme.spacing.xl};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  cursor: pointer;
  text-align: center;
  box-shadow: ${({ theme }) => theme.shadows.md};
  animation: ${flipIn} 0.2s ease;
  ${({ flipped, theme }) => flipped && css`
    border-color: ${theme.colors.primary};
    background: #f0f7ff;
  `}
`;

const CardFront = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: bold;
`;

const CardBack = styled.div`
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1.6;
  white-space: pre-wrap;
`;

const ReviewControls = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.md};
`;

const SessionStats = styled.div`
  width: 480px;
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  padding: ${({ theme }) => theme.spacing.lg};
  background: ${({ theme }) => theme.colors.surface};
  text-align: center;

  h2 { margin: 0 0 12px; }
  .stats { display: flex; justify-content: center; gap: 32px; margin: 16px 0; }
  .stat { .value { font-size: 32px; font-weight: bold; } .label { font-size: 13px; color: #666; } }
`;

function ReviewPage() {
  const {
    sessionCardIds, currentIndex, isFlipped, sessionComplete, isStarting,
    startSession, flipCard, recordResult, advance,
  } = useStore();

  const [currentCardData, setCurrentCardData] = useState<CardDetail | null>(null);
  const [loadingCard, setLoadingCard] = useState(false);
  const [sessionStats, setSessionStats] = useState({ learned: 0, notLearned: 0 });

  // Load card data for current card in session
  useEffect(() => {
    const cardId = sessionCardIds[currentIndex];
    if (!cardId) return;
    setLoadingCard(true);
    commands.getCard(cardId).then((result) => {
      if (result.ok) setCurrentCardData(result.data);
      setLoadingCard(false);
    });
  }, [sessionCardIds, currentIndex]);

  const handleResult = async (result: "learned" | "not_learned") => {
    const cardId = sessionCardIds[currentIndex];
    if (!cardId) return;
    await recordResult(cardId, result);
    setSessionStats(prev => ({
      learned: prev.learned + (result === "learned" ? 1 : 0),
      notLearned: prev.notLearned + (result === "not_learned" ? 1 : 0),
    }));
    advance();
  };

  const handleStart = () => {
    setSessionStats({ learned: 0, notLearned: 0 });
    setCurrentCardData(null);
    startSession();
  };

  if (sessionComplete && sessionCardIds.length > 0) {
    return (
      <PageContainer>
        <ReviewLayout>
          <SessionStats>
            <h2>Session Complete!</h2>
            <div className="stats">
              <div className="stat">
                <div className="value" style={{ color: "#21ba45" }}>{sessionStats.learned}</div>
                <div className="label">Learned</div>
              </div>
              <div className="stat">
                <div className="value" style={{ color: "#db2828" }}>{sessionStats.notLearned}</div>
                <div className="label">Not learned</div>
              </div>
              <div className="stat">
                <div className="value">{sessionCardIds.length}</div>
                <div className="label">Total</div>
              </div>
            </div>
            <Button primary onClick={handleStart}>Review Again</Button>
          </SessionStats>
        </ReviewLayout>
      </PageContainer>
    );
  }

  if (isStarting || loadingCard) {
    return <PageContainer><Loader active inline="centered" /></PageContainer>;
  }

  if (sessionCardIds.length === 0 && !isStarting) {
    return (
      <PageContainer>
        <ReviewLayout>
          <h2>Review Cards</h2>
          <Message info>
            <Message.Header>No cards in library</Message.Header>
            <p>Save words as cards from the headword detail page to start reviewing.</p>
          </Message>
          <Button primary onClick={handleStart}>Start Review</Button>
        </ReviewLayout>
      </PageContainer>
    );
  }

  if (sessionCardIds.length > 0 && currentCardData) {
    const progress = Math.round((currentIndex / sessionCardIds.length) * 100);
    return (
      <PageContainer>
        <ReviewLayout>
          <div style={{ width: "480px" }}>
            <Progress percent={progress} indicating size="small" />
            <div style={{ textAlign: "right", fontSize: "12px", color: "#666", marginTop: "4px" }}>
              {currentIndex + 1} / {sessionCardIds.length}
            </div>
          </div>

          <FlipCard flipped={isFlipped} onClick={flipCard}>
            {!isFlipped ? (
              <CardFront>{currentCardData.headword}</CardFront>
            ) : (
              <CardBack>{currentCardData.answerText}</CardBack>
            )}
            {!isFlipped && (
              <div style={{ marginTop: "16px", fontSize: "12px", color: "#999" }}>
                Click to reveal answer
              </div>
            )}
          </FlipCard>

          {isFlipped && (
            <ReviewControls>
              <Button
                size="large"
                color="red"
                onClick={() => handleResult("not_learned")}
              >
                Not learned
              </Button>
              <Button
                size="large"
                color="green"
                onClick={() => handleResult("learned")}
              >
                Learned
              </Button>
            </ReviewControls>
          )}
        </ReviewLayout>
      </PageContainer>
    );
  }

  // Initial state — show start button
  return (
    <PageContainer>
      <ReviewLayout>
        <h2>Review Cards</h2>
        <Button primary size="large" onClick={handleStart} loading={isStarting}>
          Start Review
        </Button>
      </ReviewLayout>
    </PageContainer>
  );
}

export default ReviewPage;
