import type { Language } from '../types/language';
import type { Mission, MissionChallenge, MissionPhrase, MissionQuestion } from '../types/mission';

// Authored starter material. See docs/mission-curriculum.md for scope and review status.
const phrase = (id: string, text: string, translation: string, concept: string, explanation: string, alternatives: string[] = []): MissionPhrase =>
  ({ id, text, translation, concept, explanation, alternatives });
const question = (id: string, phraseId: string, prompt: string, options: string[], correctIndex: number, explanation: string): MissionQuestion =>
  ({ id, phraseId, prompt, options, correctIndex, explanation });
const challenge = (situation: string, prompt: string, modelAnswer: string, translation: string, checklist: string[]): MissionChallenge =>
  ({ situation, prompt, modelAnswer, translation, checklist });

const spanish: Mission[] = [
  {
    id: 'spanish-cafe', language: 'spanish', goal: 'everyday', title: 'Your first café order',
    description: 'Order a drink, add a detail, and say whether you are staying.',
    objective: 'Politely order a drink to take away and ask its price.', minutes: 8, version: 1,
    phrases: [
      phrase('polite-request', 'Quisiera un café, por favor.', 'I would like a coffee, please.', 'Polite requests', 'Quisiera softens a request. Keep un with café when ordering one coffee.', ['Me gustaría un café, por favor.', 'Un café, por favor.']),
      phrase('size-or-detail', 'Con leche, por favor.', 'With milk, please.', 'Adding a detail', 'Con means with. Sin means without: sin leche is without milk.', ['Por favor, con leche.']),
      phrase('take-away', 'Para llevar, por favor.', 'To take away, please.', 'Staying or taking away', 'Para llevar means to go or to take away. Para tomar aquí means to drink here.'),
      phrase('ask-price', '¿Cuánto cuesta?', 'How much does it cost?', 'Asking a price', 'Cuánto asks how much. Cuesta refers to one item; cuestan is used for several.', ['¿Cuánto es?']),
    ],
    story: {
      title: 'Ana stops before work',
      text: 'Ana: Buenos días. Quisiera un café, por favor.\nBarista: ¿Con leche?\nAna: Sí, con leche, por favor.\nBarista: ¿Para tomar aquí o para llevar?\nAna: Para llevar, por favor. ¿Cuánto cuesta?\nBarista: Dos euros.',
      translation: 'Ana: Good morning. I would like a coffee, please.\nBarista: With milk?\nAna: Yes, with milk, please.\nBarista: To drink here or to take away?\nAna: To take away, please. How much does it cost?\nBarista: Two euros.',
    },
    questions: [
      question('drink', 'size-or-detail', 'What does Ana want in her coffee?', ['Sugar', 'Milk', 'Nothing'], 1, 'Ana confirms con leche: with milk.'),
      question('place', 'take-away', 'Where will Ana have her drink?', ['Inside the café', 'She has not decided', 'Away from the café'], 2, 'Para llevar tells the barista she is taking the drink away.'),
    ],
    challenge: challenge('You are in a café before work.', 'Order one coffee with milk to take away, then ask the price.', 'Quisiera un café con leche, por favor. Para llevar. ¿Cuánto cuesta?', 'I would like a coffee with milk, please. To take away. How much does it cost?', ['Politely ask for one coffee', 'Include milk and take away', 'Ask the price']),
    transfer: {
      story: {
        text: 'Luis: Quisiera un té, por favor.\nBarista: ¿Con leche?\nLuis: No, sin leche. Para tomar aquí, por favor.\nBarista: Son tres euros.\nLuis: Gracias.',
        translation: 'Luis: I would like a tea, please.\nBarista: With milk?\nLuis: No, without milk. To drink here, please.\nBarista: That is three euros.\nLuis: Thank you.',
      },
      questions: [
        question('transfer-detail', 'size-or-detail', 'How does Luis want his tea?', ['Without milk', 'With milk', 'With extra milk'], 0, 'Sin leche means without milk; the barista offers milk, but Luis declines.'),
        question('transfer-place', 'take-away', 'What should the barista prepare?', ['A coffee to take away', 'A tea to drink here', 'A tea to take away'], 1, 'Luis asks for un té and says para tomar aquí.'),
      ],
      challenge: challenge('You have time to sit down at a different café.', 'Order a coffee without milk, to drink here. Ask the price.', 'Quisiera un café sin leche, por favor. Para tomar aquí. ¿Cuánto cuesta?', 'I would like a coffee without milk, please. To drink here. How much does it cost?', ['Politely order a coffee', 'Specify no milk and drinking here', 'Ask the price']),
    },
  },
  {
    id: 'spanish-introductions', language: 'spanish', goal: 'social', title: 'Start a friendly conversation',
    description: 'Introduce yourself and keep a short conversation going.',
    objective: 'Greet someone, share a name and origin, and ask about them.', minutes: 8, version: 1,
    phrases: [
      phrase('greeting', 'Hola, ¿qué tal?', 'Hi, how are you?', 'Friendly greetings', 'An informal greeting for a peer. A short bien, gracias is a natural reply.', ['Hola, ¿cómo estás?']),
      phrase('name', 'Me llamo Ana.', 'My name is Ana.', 'Introducing yourself', 'Me llamo introduces your name. Replace Ana with the name you want to give.', ['Mi nombre es Ana.', 'Soy Ana.']),
      phrase('origin', 'Soy de México.', 'I am from Mexico.', 'Origin and identity', 'Use soy de plus a place for origin. Vivo en means I live in and gives different information.'),
      phrase('return-question', '¿Y tú, de dónde eres?', 'And you, where are you from?', 'Returning a question', 'Tú and eres address one person informally. De dónde asks about origin.', ['¿De dónde eres tú?', '¿De dónde eres?']),
    ],
    story: {
      title: 'Two people meet at a language exchange',
      text: 'Ana: Hola, ¿qué tal? Me llamo Ana.\nLeo: Hola, Ana. Me llamo Leo.\nAna: Soy de México. ¿Y tú, de dónde eres?\nLeo: Soy de Chile, pero vivo en Madrid.\nAna: Yo también vivo en Madrid.',
      translation: 'Ana: Hi, how are you? My name is Ana.\nLeo: Hi, Ana. My name is Leo.\nAna: I am from Mexico. And you, where are you from?\nLeo: I am from Chile, but I live in Madrid.\nAna: I live in Madrid too.',
    },
    questions: [
      question('origin', 'origin', 'Where is Leo from?', ['Madrid', 'Mexico', 'Chile'], 2, 'Leo says soy de Chile. Madrid is where he lives now.'),
      question('question', 'return-question', 'What does Ana ask Leo?', ['Where he is from', 'What his job is', 'When he arrived'], 0, 'De dónde eres asks where a person is from.'),
    ],
    challenge: challenge('You are playing Ana at a friendly language exchange.', 'Greet someone, introduce yourself as Ana from Mexico, then ask where they are from.', 'Hola, ¿qué tal? Me llamo Ana. Soy de México. ¿Y tú, de dónde eres?', 'Hi, how are you? My name is Ana. I am from Mexico. And you, where are you from?', ['Greet your conversation partner', 'Give the name Ana and origin Mexico', 'Return a question about their origin']),
    transfer: {
      story: {
        text: 'Marta: Hola. Me llamo Marta. Soy de Perú, pero vivo en Barcelona. ¿Y tú, de dónde eres?\nPablo: Soy de Colombia. Vivo en Barcelona también.\nMarta: ¡Qué bien!',
        translation: 'Marta: Hi. My name is Marta. I am from Peru, but I live in Barcelona. And you, where are you from?\nPablo: I am from Colombia. I live in Barcelona too.\nMarta: How nice!',
      },
      questions: [
        question('transfer-origin', 'origin', 'Where is Marta originally from?', ['Colombia', 'Peru', 'Barcelona'], 1, 'Marta uses soy de Perú for her origin and vivo en Barcelona for her current home.'),
        question('transfer-person', 'name', 'Who says they are from Colombia?', ['Marta', 'Both people', 'Pablo'], 2, 'Pablo answers soy de Colombia after Marta asks about his origin.'),
      ],
      challenge: challenge('A new conversation partner has just introduced themselves.', 'Play Sam from Mexico. Greet them, give your name and origin, and ask where they are from.', 'Hola, ¿qué tal? Me llamo Sam. Soy de México. ¿Y tú, de dónde eres?', 'Hi, how are you? My name is Sam. I am from Mexico. And you, where are you from?', ['Use the new name Sam', 'Say you are from Mexico', 'Keep the conversation going with a question']),
    },
  },
  {
    id: 'spanish-appointment', language: 'spanish', goal: 'appointments', title: 'Find a time that works',
    description: 'Arrange an appointment when the first suggestion does not work.',
    objective: 'Decline an unavailable time, suggest another, and confirm it.', minutes: 9, version: 1,
    phrases: [
      phrase('appointment-request', 'Quisiera pedir una cita.', 'I would like to make an appointment.', 'Requesting an appointment', 'Pedir una cita means to request an appointment. Una cita can mean a date in other contexts.', ['Me gustaría pedir una cita.']),
      phrase('unavailable', 'El lunes no puedo.', 'I cannot make it on Monday.', 'Declining a time', 'No goes before puedo. El lunes names the specific Monday being discussed.', ['No puedo el lunes.']),
      phrase('alternative-time', '¿Puede ser el martes a las diez?', 'Could it be Tuesday at ten?', 'Suggesting another time', 'Use a las with most clock hours. One o’clock uses a la una.', ['¿Es posible el martes a las diez?']),
      phrase('confirmation', 'Entonces, el martes a las diez. Gracias.', 'So, Tuesday at ten. Thank you.', 'Confirming details', 'Repeat the agreed day and time to check that both people understood.'),
    ],
    story: {
      title: 'A haircut that fits the week',
      text: 'Ana: Buenos días. Quisiera pedir una cita.\nRecepcionista: ¿El lunes a las diez?\nAna: El lunes no puedo. ¿Puede ser el martes a las diez?\nRecepcionista: Sí, el martes a las diez está bien.\nAna: Entonces, el martes a las diez. Gracias.',
      translation: 'Ana: Good morning. I would like to make an appointment.\nReceptionist: Monday at ten?\nAna: I cannot make it on Monday. Could it be Tuesday at ten?\nReceptionist: Yes, Tuesday at ten is fine.\nAna: So, Tuesday at ten. Thank you.',
    },
    questions: [
      question('unavailable', 'unavailable', 'Which day does Ana decline?', ['Monday', 'Tuesday', 'Wednesday'], 0, 'El lunes no puedo means she cannot make it on Monday.'),
      question('confirmed', 'confirmation', 'What time do they finally agree on?', ['Monday at ten', 'Tuesday at ten', 'Tuesday at two'], 1, 'The receptionist accepts Tuesday at ten, and Ana repeats it.'),
    ],
    challenge: challenge('The salon offers Monday at ten, but you are busy.', 'Say Monday does not work. Suggest Tuesday at ten, then repeat that day and time to confirm.', 'El lunes no puedo. ¿Puede ser el martes a las diez? Entonces, el martes a las diez. Gracias.', 'I cannot make it on Monday. Could it be Tuesday at ten? So, Tuesday at ten. Thank you.', ['Decline Monday', 'Suggest Tuesday at ten', 'Repeat the agreed day and time']),
    transfer: {
      story: {
        text: 'Luis: Quisiera pedir una cita.\nRecepcionista: ¿El jueves a las once?\nLuis: El jueves no puedo. ¿Puede ser el viernes a las once?\nRecepcionista: A las once no. ¿A las dos?\nLuis: Sí, el viernes a las dos. Gracias.',
        translation: 'Luis: I would like to make an appointment.\nReceptionist: Thursday at eleven?\nLuis: I cannot make it on Thursday. Could it be Friday at eleven?\nReceptionist: Not at eleven. At two?\nLuis: Yes, Friday at two. Thank you.',
      },
      questions: [
        question('transfer-day', 'unavailable', 'Which day is impossible for Luis?', ['Friday', 'Tuesday', 'Thursday'], 2, 'Luis explicitly says el jueves no puedo: he cannot make Thursday.'),
        question('transfer-time', 'confirmation', 'Which appointment is actually confirmed?', ['Friday at two', 'Friday at eleven', 'Thursday at eleven'], 0, 'Eleven is rejected. Luis accepts el viernes a las dos, Friday at two.'),
      ],
      challenge: challenge('Thursday is unavailable for you. Friday at two has been offered.', 'Decline Thursday, then accept and clearly confirm Friday at two.', 'El jueves no puedo. Sí, el viernes a las dos está bien. Gracias.', 'I cannot make it on Thursday. Yes, Friday at two is fine. Thank you.', ['Decline Thursday', 'Accept the changed time of two', 'Confirm Friday and thank the other person']),
    },
  },
];

const french: Mission[] = [
  {
    id: 'french-cafe', language: 'french', goal: 'everyday', title: 'Your first café order',
    description: 'Order a drink, add a detail, and say whether you are staying.',
    objective: 'Politely order a drink to take away and ask its price.', minutes: 8, version: 1,
    phrases: [
      phrase('polite-request', 'Je voudrais un café, s’il vous plaît.', 'I would like a coffee, please.', 'Polite requests', 'Je voudrais is a polite way to ask. Use s’il vous plaît with a server; s’il te plaît is informal.', ['Un café, s’il vous plaît.', 'J’aimerais un café, s’il vous plaît.', 'Je voudrais un café, s’il te plaît.']),
      phrase('size-or-detail', 'Sans sucre, s’il vous plaît.', 'Without sugar, please.', 'Adding a detail', 'Sans means without. Avec means with: avec du sucre is with sugar.', ['Sans sucre, s’il te plaît.']),
      phrase('take-away', 'À emporter, s’il vous plaît.', 'To take away, please.', 'Staying or taking away', 'À emporter means to take away. Sur place means to have it here.', ['À emporter, s’il te plaît.']),
      phrase('ask-price', 'Ça coûte combien ?', 'How much does it cost?', 'Asking a price', 'Combien asks how much. This question order is common in conversation.', ['Combien ça coûte ?', 'Combien est-ce que ça coûte ?']),
    ],
    story: {
      title: 'Camille stops before work',
      text: 'Camille : Bonjour. Je voudrais un café, s’il vous plaît.\nServeur : Avec du sucre ?\nCamille : Non, sans sucre, s’il vous plaît.\nServeur : Sur place ou à emporter ?\nCamille : À emporter. Ça coûte combien ?\nServeur : Deux euros.',
      translation: 'Camille: Hello. I would like a coffee, please.\nServer: With sugar?\nCamille: No, without sugar, please.\nServer: To have here or to take away?\nCamille: To take away. How much does it cost?\nServer: Two euros.',
    },
    questions: [
      question('detail', 'size-or-detail', 'Does Camille want sugar?', ['Yes, extra sugar', 'No sugar', 'They do not say'], 1, 'Camille declines the offer with non, sans sucre.'),
      question('place', 'take-away', 'Where will Camille have the coffee?', ['Away from the café', 'At a café table', 'It is not decided'], 0, 'À emporter tells the server the coffee is to take away.'),
    ],
    challenge: challenge('You are ordering before work.', 'Politely order a coffee without sugar to take away, then ask the price.', 'Je voudrais un café sans sucre, s’il vous plaît. À emporter. Ça coûte combien ?', 'I would like a coffee without sugar, please. To take away. How much does it cost?', ['Politely order a coffee', 'Specify no sugar and take away', 'Ask the price']),
    transfer: {
      story: {
        text: 'Noah : Bonjour. Je voudrais un thé, s’il vous plaît.\nServeur : Sans sucre ?\nNoah : Avec du sucre, s’il vous plaît. Et sur place.\nServeur : Très bien. Trois euros.\nNoah : Merci.',
        translation: 'Noah: Hello. I would like a tea, please.\nServer: Without sugar?\nNoah: With sugar, please. And to have here.\nServer: Very good. Three euros.\nNoah: Thank you.',
      },
      questions: [
        question('transfer-detail', 'size-or-detail', 'How does Noah want the tea?', ['Without sugar', 'With milk', 'With sugar'], 2, 'The server suggests no sugar, but Noah specifies avec du sucre.'),
        question('transfer-place', 'take-away', 'What should the server prepare?', ['A tea to take away', 'A tea to have here', 'A coffee to have here'], 1, 'Noah asks for un thé and says sur place.'),
      ],
      challenge: challenge('You have time to sit down in another café.', 'Order a coffee with sugar, to have here. Ask the price.', 'Je voudrais un café avec du sucre, s’il vous plaît. Sur place. Ça coûte combien ?', 'I would like a coffee with sugar, please. To have here. How much does it cost?', ['Politely order a coffee', 'Specify sugar and staying here', 'Ask the price']),
    },
  },
  {
    id: 'french-introductions', language: 'french', goal: 'social', title: 'Start a friendly conversation',
    description: 'Introduce yourself and keep a short conversation going.',
    objective: 'Greet someone, share a name and origin, and ask about them.', minutes: 8, version: 1,
    phrases: [
      phrase('greeting', 'Salut, ça va ?', 'Hi, how are you?', 'Friendly greetings', 'Salut and tu are informal, suitable for a friendly conversation with a peer.', ['Salut, comment ça va ?']),
      phrase('name', 'Je m’appelle Camille.', 'My name is Camille.', 'Introducing yourself', 'Je m’appelle introduces your name. M’ is the shortened form of me before a vowel.', ['Moi, c’est Camille.']),
      phrase('origin', 'Je viens du Canada.', 'I am from Canada.', 'Origin and identity', 'In this introduction, je viens de gives origin. De + le becomes du before Canada.'),
      phrase('return-question', 'Et toi, tu viens d’où ?', 'And you, where are you from?', 'Returning a question', 'Tu viens d’où is a common conversational question. Toi emphasizes the person you ask.', ['Et toi, d’où viens-tu ?', 'Tu viens d’où ?']),
    ],
    story: {
      title: 'A conversation at a language exchange',
      text: 'Camille : Salut, ça va ? Je m’appelle Camille.\nLéo : Salut ! Moi, c’est Léo.\nCamille : Je viens du Canada. Et toi, tu viens d’où ?\nLéo : Je viens de Belgique, mais j’habite à Lyon.\nCamille : Moi aussi, j’habite à Lyon.',
      translation: 'Camille: Hi, how are you? My name is Camille.\nLéo: Hi! I’m Léo.\nCamille: I am from Canada. And you, where are you from?\nLéo: I am from Belgium, but I live in Lyon.\nCamille: I live in Lyon too.',
    },
    questions: [
      question('origin', 'origin', 'Where is Léo from?', ['Belgium', 'Canada', 'Lyon'], 0, 'Léo says je viens de Belgique. J’habite à Lyon gives his current home.'),
      question('question', 'return-question', 'What does Camille ask Léo?', ['Where he works', 'How long he will stay', 'Where he is from'], 2, 'Tu viens d’où asks about where someone comes from in this introduction.'),
    ],
    challenge: challenge('You are playing Camille at a friendly language exchange.', 'Greet someone, introduce yourself as Camille from Canada, then ask where they are from.', 'Salut, ça va ? Je m’appelle Camille. Je viens du Canada. Et toi, tu viens d’où ?', 'Hi, how are you? My name is Camille. I am from Canada. And you, where are you from?', ['Use a friendly greeting', 'Give the name Camille and origin Canada', 'Return a question about their origin']),
    transfer: {
      story: {
        text: 'Nora : Salut ! Je m’appelle Nora. Je viens de Suisse, mais j’habite à Paris. Et toi, tu viens d’où ?\nAmine : Je viens du Maroc. Moi aussi, j’habite à Paris.\nNora : Super !',
        translation: 'Nora: Hi! My name is Nora. I am from Switzerland, but I live in Paris. And you, where are you from?\nAmine: I am from Morocco. I live in Paris too.\nNora: Great!',
      },
      questions: [
        question('transfer-origin', 'origin', 'Where is Nora from?', ['Paris', 'Switzerland', 'Morocco'], 1, 'Nora says je viens de Suisse. Paris is where she lives.'),
        question('transfer-person', 'name', 'Who says they are from Morocco?', ['Amine', 'Nora', 'Both people'], 0, 'Amine answers je viens du Maroc.'),
      ],
      challenge: challenge('A new conversation partner has just introduced themselves.', 'Play Sam from Canada. Greet them, give your name and origin, and ask where they are from.', 'Salut, ça va ? Je m’appelle Sam. Je viens du Canada. Et toi, tu viens d’où ?', 'Hi, how are you? My name is Sam. I am from Canada. And you, where are you from?', ['Use the new name Sam', 'Say you are from Canada', 'Keep the conversation going with a question']),
    },
  },
  {
    id: 'french-appointment', language: 'french', goal: 'appointments', title: 'Find a time that works',
    description: 'Arrange an appointment when the first suggestion does not work.',
    objective: 'Decline an unavailable time, suggest another, and confirm it.', minutes: 9, version: 1,
    phrases: [
      phrase('appointment-request', 'Je voudrais prendre rendez-vous.', 'I would like to make an appointment.', 'Requesting an appointment', 'Prendre rendez-vous is the usual phrase for making an appointment.', ['J’aimerais prendre rendez-vous.']),
      phrase('unavailable', 'Je ne peux pas lundi.', 'I cannot make it on Monday.', 'Declining a time', 'Ne … pas surrounds peux. In speech, ne is often omitted; the full form is useful to learn.', ['Lundi, je ne peux pas.']),
      phrase('alternative-time', 'Est-ce possible mardi à dix heures ?', 'Is Tuesday at ten possible?', 'Suggesting another time', 'À introduces a clock time. Here mardi means the Tuesday being discussed.', ['Mardi à dix heures, c’est possible ?']),
      phrase('confirmation', 'Donc, mardi à dix heures. Merci.', 'So, Tuesday at ten. Thank you.', 'Confirming details', 'Donc means so. Repeat the final day and time to confirm the arrangement.'),
    ],
    story: {
      title: 'A haircut that fits the week',
      text: 'Camille : Bonjour. Je voudrais prendre rendez-vous.\nRéceptionniste : Lundi à dix heures ?\nCamille : Je ne peux pas lundi. Est-ce possible mardi à dix heures ?\nRéceptionniste : Oui, mardi à dix heures, c’est possible.\nCamille : Donc, mardi à dix heures. Merci.',
      translation: 'Camille: Hello. I would like to make an appointment.\nReceptionist: Monday at ten?\nCamille: I cannot make it on Monday. Is Tuesday at ten possible?\nReceptionist: Yes, Tuesday at ten is possible.\nCamille: So, Tuesday at ten. Thank you.',
    },
    questions: [
      question('unavailable', 'unavailable', 'Which day does Camille decline?', ['Tuesday', 'Monday', 'Wednesday'], 1, 'Je ne peux pas lundi means Monday is not possible for Camille.'),
      question('confirmed', 'confirmation', 'What appointment do they agree on?', ['Tuesday at two', 'Monday at ten', 'Tuesday at ten'], 2, 'Both speakers confirm mardi à dix heures.'),
    ],
    challenge: challenge('The salon offers Monday at ten, but you are busy.', 'Say Monday does not work. Suggest Tuesday at ten, then repeat that day and time to confirm.', 'Je ne peux pas lundi. Est-ce possible mardi à dix heures ? Donc, mardi à dix heures. Merci.', 'I cannot make it on Monday. Is Tuesday at ten possible? So, Tuesday at ten. Thank you.', ['Decline Monday', 'Suggest Tuesday at ten', 'Repeat the agreed day and time']),
    transfer: {
      story: {
        text: 'Noah : Je voudrais prendre rendez-vous.\nRéceptionniste : Jeudi à onze heures ?\nNoah : Je ne peux pas jeudi. Est-ce possible vendredi à onze heures ?\nRéceptionniste : Pas à onze heures. À quatorze heures ?\nNoah : Oui, vendredi à quatorze heures. Merci.',
        translation: 'Noah: I would like to make an appointment.\nReceptionist: Thursday at eleven?\nNoah: I cannot make it on Thursday. Is Friday at eleven possible?\nReceptionist: Not at eleven. At two in the afternoon?\nNoah: Yes, Friday at two in the afternoon. Thank you.',
      },
      questions: [
        question('transfer-day', 'unavailable', 'Which day is impossible for Noah?', ['Thursday', 'Friday', 'Tuesday'], 0, 'Noah says je ne peux pas jeudi.'),
        question('transfer-time', 'confirmation', 'Which appointment is actually confirmed?', ['Friday at eleven', 'Friday at two in the afternoon', 'Thursday at eleven'], 1, 'Quatorze heures is 14:00, or two in the afternoon. The earlier time is rejected.'),
      ],
      challenge: challenge('Thursday is unavailable for you. Friday at 14:00 has been offered.', 'Decline Thursday, then accept and confirm Friday at 14:00.', 'Je ne peux pas jeudi. Oui, vendredi à quatorze heures, c’est parfait. Merci.', 'I cannot make it on Thursday. Yes, Friday at two in the afternoon is perfect. Thank you.', ['Decline Thursday', 'Accept the new time of 14:00', 'Confirm Friday and thank the other person']),
    },
  },
];

const dutch: Mission[] = [
  {
    id: 'dutch-cafe', language: 'dutch', goal: 'everyday', title: 'Your first café order',
    description: 'Order a drink, add a detail, and say whether you are staying.',
    objective: 'Politely order a drink to take away and ask its price.', minutes: 8, version: 1,
    phrases: [
      phrase('polite-request', 'Mag ik een koffie, alstublieft?', 'May I have a coffee, please?', 'Polite requests', 'Mag ik … ? is a common polite request. Alstublieft is polite; alsjeblieft is informal.', ['Een koffie, alstublieft.', 'Ik wil graag een koffie, alstublieft.', 'Mag ik een koffie, alsjeblieft?']),
      phrase('size-or-detail', 'Zonder suiker, alstublieft.', 'Without sugar, please.', 'Adding a detail', 'Zonder means without. Met means with: met suiker is with sugar.', ['Zonder suiker, alsjeblieft.', 'Zonder suiker, graag.']),
      phrase('take-away', 'Om mee te nemen, alstublieft.', 'To take away, please.', 'Staying or taking away', 'Mee te nemen means to take along. Voor hier is a short reply when you will stay.', ['Om mee te nemen, graag.', 'Om mee te nemen, alsjeblieft.']),
      phrase('ask-price', 'Hoeveel kost het?', 'How much does it cost?', 'Asking a price', 'Hoeveel asks how much. In this question, the verb kost comes before the subject het.', ['Wat kost het?']),
    ],
    story: {
      title: 'Noor stops before work',
      text: 'Noor: Goedemorgen. Mag ik een koffie, alstublieft?\nBarista: Met suiker?\nNoor: Nee, zonder suiker, alstublieft.\nBarista: Voor hier of om mee te nemen?\nNoor: Om mee te nemen. Hoeveel kost het?\nBarista: Twee euro.',
      translation: 'Noor: Good morning. May I have a coffee, please?\nBarista: With sugar?\nNoor: No, without sugar, please.\nBarista: For here or to take away?\nNoor: To take away. How much does it cost?\nBarista: Two euros.',
    },
    questions: [
      question('detail', 'size-or-detail', 'Does Noor want sugar?', ['Yes, extra sugar', 'No sugar', 'She does not say'], 1, 'Noor says nee, zonder suiker: no, without sugar.'),
      question('place', 'take-away', 'Where will Noor have the coffee?', ['At a café table', 'It is not decided', 'Away from the café'], 2, 'Om mee te nemen means she will take the drink with her.'),
    ],
    challenge: challenge('You are ordering before work.', 'Politely order a coffee without sugar to take away, then ask the price.', 'Mag ik een koffie zonder suiker, alstublieft? Om mee te nemen. Hoeveel kost het?', 'May I have a coffee without sugar, please? To take away. How much does it cost?', ['Politely ask for a coffee', 'Specify no sugar and take away', 'Ask the price']),
    transfer: {
      story: {
        text: 'Daan: Mag ik een thee, alstublieft?\nBarista: Zonder suiker?\nDaan: Met suiker, alstublieft. En voor hier.\nBarista: Dat is drie euro.\nDaan: Dank u wel.',
        translation: 'Daan: May I have a tea, please?\nBarista: Without sugar?\nDaan: With sugar, please. And for here.\nBarista: That is three euros.\nDaan: Thank you.',
      },
      questions: [
        question('transfer-detail', 'size-or-detail', 'How does Daan want the tea?', ['With sugar', 'Without sugar', 'With milk'], 0, 'Daan corrects the suggestion and says met suiker.'),
        question('transfer-place', 'take-away', 'What should the barista prepare?', ['A coffee for here', 'A tea for here', 'A tea to take away'], 1, 'Daan orders een thee and specifies voor hier.'),
      ],
      challenge: challenge('You have time to sit down in another café.', 'Order a coffee with sugar, to have here. Ask the price.', 'Mag ik een koffie met suiker, alstublieft? Voor hier. Hoeveel kost het?', 'May I have a coffee with sugar, please? For here. How much does it cost?', ['Politely order a coffee', 'Specify sugar and staying here', 'Ask the price']),
    },
  },
  {
    id: 'dutch-introductions', language: 'dutch', goal: 'social', title: 'Start a friendly conversation',
    description: 'Introduce yourself and keep a short conversation going.',
    objective: 'Greet someone, share a name and origin, and ask about them.', minutes: 8, version: 1,
    phrases: [
      phrase('greeting', 'Hoi, hoe gaat het?', 'Hi, how are you?', 'Friendly greetings', 'Hoi is informal and friendly. Goed, dank je is a natural short reply.', ['Hallo, hoe gaat het?']),
      phrase('name', 'Ik heet Noor.', 'My name is Noor.', 'Introducing yourself', 'Ik heet introduces your name. Replace Noor with the name you want to give.', ['Mijn naam is Noor.', 'Ik ben Noor.']),
      phrase('origin', 'Ik kom uit Nederland.', 'I am from the Netherlands.', 'Origin and identity', 'Ik kom uit introduces your origin. Ik woon in says where you live now.'),
      phrase('return-question', 'En jij, waar kom je vandaan?', 'And you, where are you from?', 'Returning a question', 'With je after the verb in a question, use kom, not komt. Jij adds emphasis.', ['Waar kom je vandaan?', 'En jij, waar kom jij vandaan?']),
    ],
    story: {
      title: 'A conversation at a language exchange',
      text: 'Noor: Hoi, hoe gaat het? Ik heet Noor.\nLuca: Hoi! Ik heet Luca.\nNoor: Ik kom uit Nederland. En jij, waar kom je vandaan?\nLuca: Ik kom uit België, maar ik woon in Utrecht.\nNoor: Ik woon ook in Utrecht.',
      translation: 'Noor: Hi, how are you? My name is Noor.\nLuca: Hi! My name is Luca.\nNoor: I am from the Netherlands. And you, where are you from?\nLuca: I am from Belgium, but I live in Utrecht.\nNoor: I live in Utrecht too.',
    },
    questions: [
      question('origin', 'origin', 'Where is Luca from?', ['The Netherlands', 'Belgium', 'Utrecht'], 1, 'Luca says ik kom uit België. Utrecht is the current home.'),
      question('question', 'return-question', 'What does Noor ask Luca?', ['What Luca does for work', 'When Luca arrived', 'Where Luca is from'], 2, 'Waar kom je vandaan asks where someone is from.'),
    ],
    challenge: challenge('You are playing Noor at a friendly language exchange.', 'Greet someone, introduce yourself as Noor from the Netherlands, then ask where they are from.', 'Hoi, hoe gaat het? Ik heet Noor. Ik kom uit Nederland. En jij, waar kom je vandaan?', 'Hi, how are you? My name is Noor. I am from the Netherlands. And you, where are you from?', ['Use a friendly greeting', 'Give the name Noor and origin the Netherlands', 'Return a question about their origin']),
    transfer: {
      story: {
        text: 'Sara: Hoi! Ik heet Sara. Ik kom uit Spanje, maar ik woon in Rotterdam. En jij, waar kom je vandaan?\nAdam: Ik kom uit Polen. Ik woon ook in Rotterdam.\nSara: Wat leuk!',
        translation: 'Sara: Hi! My name is Sara. I am from Spain, but I live in Rotterdam. And you, where are you from?\nAdam: I am from Poland. I live in Rotterdam too.\nSara: How nice!',
      },
      questions: [
        question('transfer-origin', 'origin', 'Where is Sara from?', ['Spain', 'Poland', 'Rotterdam'], 0, 'Sara says ik kom uit Spanje. Rotterdam is where she lives.'),
        question('transfer-person', 'name', 'Who says they are from Poland?', ['Sara', 'Both people', 'Adam'], 2, 'Adam answers ik kom uit Polen.'),
      ],
      challenge: challenge('A new conversation partner has just introduced themselves.', 'Play Sam from the Netherlands. Greet them, give your name and origin, and ask where they are from.', 'Hoi, hoe gaat het? Ik heet Sam. Ik kom uit Nederland. En jij, waar kom je vandaan?', 'Hi, how are you? My name is Sam. I am from the Netherlands. And you, where are you from?', ['Use the new name Sam', 'Say you are from the Netherlands', 'Keep the conversation going with a question']),
    },
  },
  {
    id: 'dutch-appointment', language: 'dutch', goal: 'appointments', title: 'Find a time that works',
    description: 'Arrange an appointment when the first suggestion does not work.',
    objective: 'Decline an unavailable time, suggest another, and confirm it.', minutes: 9, version: 1,
    phrases: [
      phrase('appointment-request', 'Ik wil graag een afspraak maken.', 'I would like to make an appointment.', 'Requesting an appointment', 'Graag makes the request friendly. The infinitive maken goes at the end.', ['Ik zou graag een afspraak willen maken.']),
      phrase('unavailable', 'Maandag kan ik niet.', 'I cannot make it on Monday.', 'Declining a time', 'With maandag first, the verb kan stays in second position, before ik.', ['Ik kan maandag niet.']),
      phrase('alternative-time', 'Kan het dinsdag om tien uur?', 'Is Tuesday at ten possible?', 'Suggesting another time', 'Use om before a clock time. Uur stays singular after a number.', ['Is dinsdag om tien uur mogelijk?']),
      phrase('confirmation', 'Dus dinsdag om tien uur. Dank u wel.', 'So, Tuesday at ten. Thank you.', 'Confirming details', 'Dus means so. Repeat the agreed time; dank u wel is a polite thank-you.', ['Dus dinsdag om tien uur. Dankuwel.']),
    ],
    story: {
      title: 'A haircut that fits the week',
      text: 'Noor: Goedemorgen. Ik wil graag een afspraak maken.\nReceptionist: Maandag om tien uur?\nNoor: Maandag kan ik niet. Kan het dinsdag om tien uur?\nReceptionist: Ja, dinsdag om tien uur kan.\nNoor: Dus dinsdag om tien uur. Dank u wel.',
      translation: 'Noor: Good morning. I would like to make an appointment.\nReceptionist: Monday at ten?\nNoor: I cannot make it on Monday. Is Tuesday at ten possible?\nReceptionist: Yes, Tuesday at ten works.\nNoor: So, Tuesday at ten. Thank you.',
    },
    questions: [
      question('unavailable', 'unavailable', 'Which day does Noor decline?', ['Monday', 'Tuesday', 'Wednesday'], 0, 'Maandag kan ik niet means she cannot make Monday.'),
      question('confirmed', 'confirmation', 'What appointment do they agree on?', ['Monday at ten', 'Tuesday at two', 'Tuesday at ten'], 2, 'The accepted and repeated time is dinsdag om tien uur.'),
    ],
    challenge: challenge('The salon offers Monday at ten, but you are busy.', 'Say Monday does not work. Suggest Tuesday at ten, then repeat that day and time to confirm.', 'Maandag kan ik niet. Kan het dinsdag om tien uur? Dus dinsdag om tien uur. Dank u wel.', 'I cannot make it on Monday. Is Tuesday at ten possible? So, Tuesday at ten. Thank you.', ['Decline Monday', 'Suggest Tuesday at ten', 'Repeat the agreed day and time']),
    transfer: {
      story: {
        text: 'Daan: Ik wil graag een afspraak maken.\nReceptionist: Donderdag om elf uur?\nDaan: Donderdag kan ik niet. Kan het vrijdag om elf uur?\nReceptionist: Om elf uur kan niet. Om twee uur?\nDaan: Ja, vrijdag om twee uur. Dank u wel.',
        translation: 'Daan: I would like to make an appointment.\nReceptionist: Thursday at eleven?\nDaan: I cannot make it on Thursday. Is Friday at eleven possible?\nReceptionist: Eleven does not work. At two?\nDaan: Yes, Friday at two. Thank you.',
      },
      questions: [
        question('transfer-day', 'unavailable', 'Which day is impossible for Daan?', ['Friday', 'Thursday', 'Tuesday'], 1, 'Daan says donderdag kan ik niet.'),
        question('transfer-time', 'confirmation', 'Which appointment is actually confirmed?', ['Friday at two', 'Thursday at eleven', 'Friday at eleven'], 0, 'The receptionist rejects eleven. Daan accepts vrijdag om twee uur.'),
      ],
      challenge: challenge('Thursday is unavailable for you. Friday at two has been offered.', 'Decline Thursday, then accept and confirm Friday at two.', 'Donderdag kan ik niet. Ja, vrijdag om twee uur is goed. Dank u wel.', 'I cannot make it on Thursday. Yes, Friday at two is fine. Thank you.', ['Decline Thursday', 'Accept the changed time of two', 'Confirm Friday and thank the other person']),
    },
  },
];

export const MISSIONS: Mission[] = [...spanish, ...french, ...dutch];

export function getMissions(language: Language): Mission[] {
  return MISSIONS.filter((mission) => mission.language === language);
}

export function getMission(language: Language, id: string): Mission | undefined {
  return MISSIONS.find((mission) => mission.language === language && mission.id === id);
}
