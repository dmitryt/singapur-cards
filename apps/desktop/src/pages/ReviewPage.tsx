import { useEffect, useState } from "react";
import styled, { css } from "styled-components";
import { Button, Progress, Message, Loader } from "semantic-ui-react";
import { useStore } from "../store";
import type { CardDetail } from "../lib/tauri/commands";
import * as commands from "../lib/tauri/commands";
import { dslToHtml } from "@/lib/dslToHtml";

const ReviewLayout = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: ${({ theme }) => theme.spacing.xl} 0;
  gap: ${({ theme }) => theme.spacing.lg};
`;

const FlipCard = styled.div`
  width: 480px;
  cursor: pointer;
  perspective: 1200px;
`;

const FlipCardInner = styled.div<{ flipped: boolean }>`
  position: relative;
  transform-style: preserve-3d;
  transition: transform 0.45s ease;
  ${({ flipped }) => flipped && css`transform: rotateY(180deg);`}
`;

const CardFace = styled.div`
  padding: ${({ theme }) => theme.spacing.xl};
  border: 2px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background: ${({ theme }) => theme.colors.surface};
  box-shadow: ${({ theme }) => theme.shadows.md};
  text-align: center;
  backface-visibility: hidden;
  -webkit-backface-visibility: hidden;
  min-height: 300px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const CardFront = styled(CardFace)`
  font-size: ${({ theme }) => theme.fontSizes.xl};
  font-weight: bold;
`;

const CardBack = styled(CardFace)<{ flipped: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  transform: rotateY(180deg);
  border-color: ${({ theme }) => theme.colors.primary};
  background: #f0f7ff;
  font-size: ${({ theme }) => theme.fontSizes.md};
  line-height: 1;
  white-space: pre-wrap;
  overflow-y: auto;
  ${({ flipped }) => flipped && css`align-items: start; justify-content: left;`}
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
      <>
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
            <Button primary onClick={handleStart}>Practice Again</Button>
          </SessionStats>
        </ReviewLayout>
      </>
    );
  }

  if (isStarting || loadingCard) {
    return <Loader active inline="centered" />;
  }

  if (sessionCardIds.length === 0 && !isStarting) {
    return (
      <>
        <ReviewLayout>
          <h2>Practice Cards</h2>
          <Message info>
            <Message.Header>No cards in library</Message.Header>
            <p>Save words as cards from the headword detail page to start practicing.</p>
          </Message>
          <Button primary onClick={handleStart}>Start Practice</Button>
        </ReviewLayout>
      </>
    );
  }

  if (sessionCardIds.length > 0 && currentCardData) {
    const progress = Math.round((currentIndex / sessionCardIds.length) * 100);
    return (
      <>
        <ReviewLayout>
          <div style={{ width: "480px" }}>
            <Progress percent={progress} indicating size="small" />
            <div style={{ textAlign: "right", fontSize: "12px", color: "#666", marginTop: "4px" }}>
              {currentIndex + 1} / {sessionCardIds.length}
            </div>
          </div>

          <FlipCard onClick={flipCard}>
            <FlipCardInner flipped={isFlipped}>
              <CardFront>
                {currentCardData.headword}
                <div style={{ marginTop: "16px", fontSize: "12px", color: "#999" }}>
                  Click to reveal answer
                </div>
              </CardFront>
              <CardBack flipped={isFlipped} dangerouslySetInnerHTML={{ __html: `${dslToHtml(currentCardData.answerText)}` }} />
            </FlipCardInner>
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
      </>
    );
  }

  // Initial state — show start button
  return (
    <>
      <ReviewLayout>
        <h2>Practice Cards</h2>
        <Button primary size="large" onClick={handleStart} loading={isStarting}>
          Start Practice
        </Button>
      </ReviewLayout>
    </>
  );
}

export default ReviewPage;
