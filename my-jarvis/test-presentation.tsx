import { Deck, Slide, Heading, Text } from 'spectacle';

export default function TestPresentation() {
  return (
    <Deck>
      <Slide backgroundColor="#ffffff">
        <Heading color="#1a1a1a">Welcome to My Jarvis</Heading>
        <Text color="#666666">Dynamic Presentation Testing</Text>
      </Slide>

      <Slide backgroundColor="#f5f5f5">
        <Heading fontSize="h2" color="#1a1a1a">Slide Two</Heading>
        <Text color="#333333">This is a test of Sandpack integration</Text>
      </Slide>

      <Slide backgroundColor="#ffffff">
        <Heading fontSize="h2" color="#1a1a1a">Slide Three</Heading>
        <Text color="#333333">Press arrow keys to navigate</Text>
      </Slide>
    </Deck>
  );
}
