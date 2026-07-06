const axios = require('axios');

const SITE_GUIDE = `
JumpTake is a two-sided job platform.

Public routes and actions:
- Candidate registration starts at /job-seeker. Candidates upload a resume, create an account, set job preferences, browse jobs, apply, track applications, take assessments, attend video interviews, build resumes, network with candidates, and manage their profile.
- Employer registration starts at /company. Employers search or register a company, create an employer account, post and manage jobs, browse the talent pool, review applications, create assessments, arrange interviews, message candidates, and manage company settings.
- Candidate login opens the candidate login dialog.
- Employer login opens the employer login dialog.
- Public visitors may browse job summaries, but opening or applying to a job requires candidate login.
- The homepage explains JumpTake, portal features, workflow, and terms.

Portal areas:
Candidate: Home, Notifications, View Candidates, Friends, Bookmarked Candidates, My Applications, My Assessments, Video Interviews, Draft Applications, Bookmarked Jobs, Job Preferences, Resume Playground, My Profile, About JumpTake, Progress Check, Settings.
Employer: Home, Notifications, Post a Job, Manage Jobs, Manage Applications, Talent Pool, Bookmarked Talents, Assessments, Interviews, Inbox, Company Profile, About JumpTake, Progress Check, Settings.
`;

const RESPONSE_PLAYBOOK = `
Use this response style bank as examples, not as a script. Vary wording, answer the latest message directly, and avoid repeating one platform overview.

Account creation:
- If they ask to create an employer account, ask for company name, business email, industry, or point them to employer registration.
- If they ask to create a candidate account, ask for name, email, field of work, or point them to candidate registration.
- If they only say "create me an account", ask whether they are joining as a candidate/job seeker or employer/hiring manager.
- If they ask to log in, ask whether candidate or employer unless they already specified.

Career tools:
- Resume requests: ask for work history, education, target role, skills, or an existing resume.
- Cover letter requests: ask for job title, company, job description, and background.
- Profile tailoring: ask for target role and the profile/summary to improve.

General conversation:
- Greetings get a friendly greeting back.
- "How are you" gets a natural status-style reply.
- General facts can be answered briefly, then gently offer JumpTake help.
- Random irrelevant requests should be answered safely and briefly, then redirected to jobs, accounts, resumes, hiring, or JumpTake.

Utility:
- Math requests should ask for the expression unless the expression is already present.
- Code requests should ask for language, goal, and features.
- Jokes, stories, food suggestions, favors, and random questions can be answered normally in one or two sentences.

Extra trained behaviors:
- If the visitor asks whether they can have two accounts, explain that they can use both candidate and employer workspaces, while keeping the role/account details separate.
- Utility requests such as currency conversion, translation, JSON formatting, passwords, debugging, SQL, regex, spreadsheets, word counts, markdown conversion, text simplification, dummy data, or pattern finding should ask for the missing input and avoid repeating the platform overview.
- Decision requests such as what to eat, what to watch, whether to buy something, career choices, travel, books, phones, college, events, exercise, or forgiveness should ask for context and give a short useful direction.
- Daily troubleshooting requests such as frozen laptops, wet phones, power outages, lockouts, deleted files, Wi-Fi, spills, ovens, plumbing, or car batteries should give immediate safe first steps.
- Goodbyes and thanks should close naturally.
`;

const normalizeText = (value) => (
  String(value || '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
);

const pickVariation = (message, options) => {
  const seed = String(message || '').split('').reduce((total, char) => total + char.charCodeAt(0), 0);
  return options[seed % options.length];
};

const LOGIC_QA = [
  ['A brother and sister were born in different years, but they celebrate their birthdays on the exact same day. How is this possible?', 'They are not twins. They were simply born on the same calendar date in different years.'],
  ['If a doctor gives you 3 pills and tells you to take one every half hour, how long will they last?', '1 hour. Take one now, one after 30 minutes, and the last after 60 minutes.'],
  ['A man pushes his car to a hotel and tells the owner he is bankrupt. Why?', 'He is playing Monopoly.'],
  ['What has keys but opens no locks, space but no room, and allows you to enter but not leave?', 'A keyboard.'],
  ['A clerk in a butcher shop is 5 feet 10 inches tall and wears size 11 shoes. What does he weigh?', 'Meat.'],
  ['If an electric train is traveling south and the wind is blowing west, which way does the smoke blow?', 'Nowhere. Electric trains do not emit smoke.'],
  ['How many months have 28 days?', 'All 12 months have at least 28 days.'],
  ['Before Mt. Everest was discovered, what was the highest mountain in the world?', 'Mt. Everest. It was still the highest before people identified it.'],
  ['Johnnys mother had three children. The first child was named April. The second child was named May. What was the third child named?', 'Johnny.'],
  ['What can run but never walks, has a mouth but never talks, has a head but never weeps, and has a bed but never sleeps?', 'A river.'],
  ['If you are running a race and you pass the person in second place, what place are you in?', 'Second place.'],
  ['What word is spelled incorrectly in every single dictionary?', 'Incorrectly.'],
  ['Brothers and sisters I have none, but that mans father is my fathers son. Who is in the photograph?', 'His son.'],
  ['What is so fragile that saying its name breaks it?', 'Silence.'],
  ['Give me food and I will live. Give me water and I will die. What am I?', 'Fire.'],
  ['What gets wetter the more it dries?', 'A towel.'],
  ['What goes up but never comes down?', 'Your age.'],
  ['A man leaves home, makes three left turns, and returns home to find two masked men waiting for him. Who are they?', 'The catcher and the umpire in a baseball game.'],
  ['What can you catch but never throw?', 'A cold.'],
  ['You see a boat filled with people. It has not capsized or sunk, but not a single person is on the boat. Why?', 'Everyone on the boat is married.'],
  ['If a rooster lays an egg on the absolute peak of a sloped roof, which side does it roll down?', 'It does not. Roosters do not lay eggs.'],
  ['A cowboy rides into town on Friday. He stays three nights, then leaves on Friday. How?', 'His horse is named Friday.'],
  ['What belongs to you, but everyone else uses it more than you do?', 'Your name.'],
  ['I have cities but no houses, forests but no trees, and water but no fish. What am I?', 'A map.'],
  ['How can a man go eight days without sleep?', 'He sleeps at night.'],
  ['If you drop a yellow hat into the Red Sea, what does it become?', 'Wet.'],
  ['What has a head and a tail but no body?', 'A coin.'],
  ['What building has the most stories?', 'A library.'],
  ['Which is heavier, a pound of feathers or a pound of bricks?', 'Neither. They both weigh one pound.'],
  ['What occurs once in a minute, twice in a moment, but never in a thousand years?', 'The letter M.'],
  ['A house has four walls, all facing south. A bear walks past one window. What color is the bear?', 'White. The house is at the North Pole, so it is a polar bear.'],
  ['What has hands but cannot clap?', 'A clock.'],
  ['What has an eye but cannot see?', 'A needle, or a storm.'],
  ['What has a neck but no head?', 'A bottle.'],
  ['If there are three apples and you take away two, how many apples do you have?', 'Two. You have the two apples you took.'],
  ['What flies without wings and cries without eyes?', 'A cloud.'],
  ['The more of them you take, the more you leave behind. What are they?', 'Footsteps.'],
  ['What goes through cities and over hills but never moves?', 'A road.'],
  ['What disappears the moment you put it in water?', 'Ice, sugar, or salt can fit depending on context.'],
  ['What has a thumb and four fingers but is not alive?', 'A glove.'],
  ['What is full of holes but can still hold water?', 'A sponge.'],
  ['What goes up and down but remains in the same spot?', 'A staircase.'],
  ['Two fathers and two sons go fishing and catch three fish, each takes one. How is this possible?', 'There are three people: a grandfather, his son, and his grandson.'],
  ['A man is born in 1975 and dies in 1975, but he is 30 years old. How?', '1975 is a room number, not the year.'],
  ['What can you hold in your left hand but never in your right hand?', 'Your right elbow.'],
  ['I am light as a feather, yet the strongest man cannot hold me for more than five minutes. What am I?', 'Breath.'],
  ['What is always in front of you but can never be seen?', 'The future.'],
  ['What breaks on the water but never on land?', 'A wave.'],
  ['What gets sharper the more you use it?', 'Your brain.'],
  ['A red house is made of red bricks and a blue house is made of blue bricks. What is a green house made of?', 'Glass.'],
  ['What kind of room has no doors or windows?', 'A mushroom.'],
  ['What has legs but cannot walk?', 'A table or chair.'],
  ['What can you hear but not see or touch, even though you control it?', 'Your voice.'],
  ['What can you hear but not see or touch, even though you control it completely?', 'Your voice.'],
  ['A man was walking in the rain without an umbrella or hat, yet no hair got wet. Why?', 'He was bald.'],
  ['What goes into the water black and comes out red?', 'A lobster when cooked.'],
  ['What can you drop that will never break, and what can you drop that will surely break?', 'A feather will not break; an egg likely will.'],
  ['What is black when you buy it, red when you use it, and gray when you throw it away?', 'Charcoal.'],
  ['What loses its head in the morning and gets it back at night?', 'A pillow.'],
  ['What has branches but no bark, fruit, or leaves?', 'A bank.'],
  ['What comes once in a second, once in a month, but never in a century?', 'The letter O.'],
  ['What has words but never speaks?', 'A book.'],
  ['You throw away the outside and cook the inside, then eat the outside and throw away the inside. What is it?', 'Corn on the cob.'],
  ['What is always coming but never arrives?', 'Tomorrow.'],
  ['I have a large collection of keys, but I cannot open a single door. What am I?', 'A piano.'],
  ['What is made of water, but if you put it in water it disappears?', 'An ice cube.'],
  ['What has a ring but no finger?', 'A telephone.'],
  ['What can travel all around the world while remaining in its corner?', 'A postage stamp.'],
  ['What gets larger the more you take away from it?', 'A hole.'],
  ['If a grandfather, two fathers, and two sons go to a movie, what is the minimum number of tickets?', 'Three tickets. They are grandfather, father, and son.'],
  ['What is easy to get into but hard to get out of?', 'Trouble.'],
  ['What is clean when it is black and dirty when it is white?', 'A blackboard.'],
  ['The person who makes it sells it. The person who buys it does not use it. The person who uses it never sees it. What is it?', 'A coffin.'],
  ['What kind of tree can you carry in your hand?', 'A palm tree.'],
  ['What is the longest word in the English language?', 'Smiles, because there is a mile between the first and last letters.'],
  ['How many bricks does it take to complete a standard brick house?', 'One: the last brick.'],
  ['What can fill an entire room without occupying physical space?', 'Light.'],
  ['What is yours but is used almost exclusively by other people?', 'Your phone number.'],
  ['What animal can jump higher than a skyscraper?', 'Any animal that can jump, because skyscrapers cannot jump.'],
  ['What has two hands, a clean face, but no arms or legs?', 'A clock.'],
  ['If you divide 30 by half and then add 10, what is the result?', '70. Dividing by half means 30 / 0.5 = 60, plus 10.'],
  ['How many birthdays does the average human being celebrate?', 'One actual birthday. The rest are anniversaries of it.'],
  ['Which weighs more, 10 ounces of pure gold or 10 ounces of loose dirt?', 'They weigh the same: 10 ounces.'],
  ['Why are 1995 pennies worth more than 1994 pennies?', 'Because 1995 pennies is one more penny than 1994 pennies.'],
  ['A man is driving a black truck with headlights off, no moon, and a black cat steps into the road. How did he see it?', 'It was daytime.'],
  ['What kind of coat can only be put on when it is wet?', 'A coat of paint.'],
  ['If five machines take five minutes to make five widgets, how long do 100 machines take to make 100 widgets?', 'Five minutes.'],
  ['What cannot talk but will always answer back immediately when spoken to?', 'An echo.'],
  ['You have one match in a dark room with an oil lamp, candle, and wood stove. Which do you light first?', 'The match.'],
  ['What is full of teeth but can never bite?', 'A comb.'],
  ['What begins with T, ends with T, and is filled with T?', 'A teapot.'],
  ['What goes up a chimney down but cannot come down a chimney up?', 'An umbrella.'],
  ['What question can you never answer honestly with yes?', 'Are you asleep yet?'],
  ['What has a bottom at the top?', 'Your legs.'],
  ['What two things can you never eat for breakfast?', 'Lunch and dinner.'],
  ['What gets smaller every time it takes a bath?', 'A bar of soap.'],
  ['A group of 10 people are under one umbrella, yet none gets wet. How?', 'It is not raining.'],
  ['Where does Friday always come before Thursday?', 'In the dictionary.'],
  ['What has a spine but no bones, and leaves but no branches?', 'A book.'],
  ['What is the next letter in this sequence: J, F, M, A, M, J, J, A?', 'S, for September in the sequence of month initials.']
].map(([question, answer]) => ({
  question,
  normalizedQuestion: normalizeText(question),
  answer
}));

const findLogicAnswer = (message) => {
  const normalized = normalizeText(message);
  if (!normalized) {
    return '';
  }

  const exact = LOGIC_QA.find((item) => normalized === item.normalizedQuestion);
  if (exact) {
    return exact.answer;
  }

  if (normalized.length < 18) {
    return '';
  }

  return LOGIC_QA.find((item) => (
    item.normalizedQuestion.length > 28
    && (
      normalized.includes(item.normalizedQuestion)
      || (normalized.length > 24 && item.normalizedQuestion.includes(normalized))
    )
  ))?.answer || '';
};

const replyRule = (id, terms, responses) => ({
  id,
  test: (normalized) => terms.some((term) => (
    term instanceof RegExp ? term.test(normalized) : normalized.includes(term)
  )),
  responses
});

const TRAINED_REPLY_RULES = [
  replyRule('two-accounts', [
    /\b(can|could|may)\s+i\s+(have|use|make|create|get)\s+(two|2|multiple|both)\s+accounts?\b/,
    /\b(two|2|multiple|both)\s+accounts?\b/,
    /\bcandidate\s+and\s+employer\s+accounts?\b/
  ], [
    'Yes. You can use JumpTake as both a candidate and an employer. Keep the workspaces separate: candidate for jobs, resumes, and applications; employer for posting jobs and managing hiring. If one email is already tied to a role, use the matching login or a separate email for the other role.',
    'Yes, that is fine. Think of them as two work modes: candidate for finding work and employer for hiring. Use the correct portal when logging in so your applications and hiring tools stay organized.',
    'You can have both roles on JumpTake. Candidate accounts handle job search and resumes, while employer accounts handle companies, posts, talent, and applications.'
  ]),
  replyRule('currency', ['convert currency', 'exchange rate', 'currency conversion'], [
    'Sure. Tell me the amount, the currency you have, and the currency you want to convert into.',
    'I can help with that. Send the amount plus the source and target currencies, like 50 USD to GBP.'
  ]),
  replyRule('translate', ['translate to spanish', 'translate this', 'translation'], [
    'Paste the text you want translated and tell me the target language.',
    'I can translate it. Send the sentence or paragraph and the language you want.'
  ]),
  replyRule('time', ['what time is it', 'current time'], [
    'Please check your device clock for the exact local time. I can help with schedules or reminders around JumpTake if you need.',
    'Your screen clock will have the accurate local time. What would you like to do next?'
  ]),
  replyRule('json', ['format this json', 'prettify json', 'validate json'], [
    'Paste the raw JSON and I will clean up the formatting and point out any syntax issues.',
    'Drop the messy JSON here and I will make it readable.'
  ]),
  replyRule('password', ['generate a safe password', 'secure password', 'random password'], [
    'Tell me the password length you want and whether symbols are allowed. I can suggest a strong format.',
    'I can help generate a strong password pattern. How many characters should it be?'
  ]),
  replyRule('debug-code', ['debug my code', 'fix my code', 'error logs', 'error log'], [
    'Paste the code and the exact error message. I will help narrow down what is breaking.',
    'Send the snippet, what you expected, and what happened instead. We will debug it step by step.'
  ]),
  replyRule('uppercase', ['uppercase', 'all caps'], [
    'Paste the text and I will convert it to uppercase.',
    'Send the text you want transformed.'
  ]),
  replyRule('sql', ['sql query', 'write sql'], [
    'Tell me the table names, columns, and the result you want, and I will write the SQL query.',
    'I can write that query. Share the schema and the goal.'
  ]),
  replyRule('ip-address', ['my ip address', 'what is my ip'], [
    'I cannot see your private network details from here. Use your device settings or a trusted IP-checking site.',
    'For privacy, I do not have access to your IP address. Your network settings can show it.'
  ]),
  replyRule('spreadsheet', ['spreadsheet formula', 'excel formula', 'google sheets formula'], [
    'Tell me the columns, cell ranges, and what you want calculated. I will write the formula.',
    'I can help with that spreadsheet formula. What cells and operation are involved?'
  ]),
  replyRule('word-count', ['count these words', 'word count', 'character count'], [
    'Paste the text and I will count the words for you.',
    'Send the paragraph or draft and I will calculate the count.'
  ]),
  replyRule('markdown', ['markdown to html', 'convert markdown'], [
    'Paste the markdown and I will convert it into clean HTML.',
    'Send the markdown block and I will turn it into HTML.'
  ]),
  replyRule('regex', ['regex pattern', 'regular expression', 'write regex'], [
    'Tell me exactly what text pattern you want to match, and I will write the regex.',
    'Regex can be picky. Send examples of what should match and what should not.'
  ]),
  replyRule('simplify', ['simplify this text', 'make this simpler', 'rewrite simply'], [
    'Paste the text and I will make it clearer and easier to read.',
    'Send the dense copy and I will simplify it.'
  ]),
  replyRule('dummy-data', ['dummy data', 'mock data', 'fake data'], [
    'Tell me the format you need, like JSON, CSV, or SQL, plus the fields and number of rows.',
    'I can generate sample data. What fields should it include?'
  ]),
  replyRule('find-patterns', ['find text patterns', 'find pattern', 'search this text'], [
    'Paste the text and tell me what keyword or pattern you want found.',
    'Send the document and the pattern you are hunting for.'
  ]),
  replyRule('choose-food', ['what should i eat', 'what food should i eat', 'hungry'], [
    'Tell me your mood: savory, sweet, spicy, healthy, or comfort food. I will help you pick.',
    'A quick balanced option is protein, carbs, and vegetables. What ingredients do you have?'
  ]),
  replyRule('decide', ['help me decide', 'choose between', 'which one should i pick'], [
    'List the options and what matters most: cost, time, risk, comfort, or outcome. I will compare them.',
    'Decision mode on. Give me the two choices and your main priorities.'
  ]),
  replyRule('quit-job', ['should i quit my job', 'quit my job'], [
    'That is a big decision. Before quitting, look at savings, backup options, stress level, career growth, and whether you have another role lined up.',
    'Let us slow it down: what is pushing you to leave, and do you have a financial or career backup plan?'
  ]),
  replyRule('movie', ['what movie should i watch', 'movie should i watch'], [
    'What mood are you in: comedy, thriller, sci-fi, drama, or something cozy?',
    'Give me a genre and one movie you liked recently, and I will suggest one.'
  ]),
  replyRule('career-choice', ['what career should i choose', 'career should i choose'], [
    'Start with three things: what you are good at, what you can tolerate daily, and what the market pays for. What fields interest you?',
    'Tell me your skills, interests, and preferred work style, and I will suggest career directions.'
  ]),
  replyRule('phone-choice', ['which phone is better', 'best phone'], [
    'Which models are you comparing, and what matters most: camera, battery, price, performance, or ecosystem?',
    'Tell me the two phones and your budget, and I will compare them clearly.'
  ]),
  replyRule('link-safety', ['is this link safe', 'is this url safe', 'safe link', 'virus link'], [
    'I cannot sandbox or click live links from here. For safety, paste only the domain if you want a quick read, and use a trusted scanner like VirusTotal before opening anything suspicious.',
    'Smart question. I cannot verify a live URL directly in this chat, but you can check it with a URL safety scanner and avoid logging in through links you did not request.'
  ]),
  replyRule('python-script', ['write a python script', 'python script', 'python code'], [
    'Python is a good pick. Tell me what the script should automate, the input it receives, and the output you want.',
    'I can write that Python script. Share the task, any required libraries, and a tiny example of the data if you have one.'
  ]),
  replyRule('pick-number', ['pick a number', 'number between 1 and 10'], [
    '7.',
    'Let us go with 7. Classic choice, weirdly powerful.'
  ]),
  replyRule('flip-coin', [
    'flip a coin',
    'coin toss',
    'heads or tails',
    /\b(flip|toss)\s+(a\s+)?coin\b/,
    /\bcoin\s+(flip|toss)\b/
  ], [
    'Heads.',
    'Digital coin flipped: heads.'
  ]),
  replyRule('rain', ['is it going to rain', 'will it rain', 'rain today'], [
    'I do not know your exact local weather from here. Check your weather app for the live forecast, and take an umbrella if the sky looks suspicious.',
    'I cannot see your location-specific forecast in this chat. Your local weather app will be more accurate.'
  ]),
  replyRule('buy-this', ['should i buy this', 'should i purchase', 'worth buying'], [
    'Tell me what it is, the price, your budget, and how often you will use it. Then I can help decide if it is worth buying.',
    'Quick test: is it useful, affordable, and something you will still want next week? Send the item details and I will compare it with you.'
  ]),
  replyRule('vacation', ['where should i go on vacation', 'vacation destination', 'travel destination'], [
    'What kind of trip do you want: beach, city, nature, culture, food, or quiet rest? Add your budget and season, and I will suggest options.',
    'Give me your budget, travel dates, and vibe, and I will help narrow down a good destination.'
  ]),
  replyRule('college', ['is college worth it', 'university worth it'], [
    'It depends on your field, cost, debt, and alternatives. For licensed careers it often matters; for tech or creative paths, portfolios and certifications can also work.',
    'Let us compare cost, career goal, and expected return. What subject are you considering?'
  ]),
  replyRule('book', ['what book should i read', 'book should i read', 'read next'], [
    'What mood are you in: fiction, self-improvement, biography, fantasy, mystery, or career growth?',
    'Tell me one book you liked and one genre you want, and I will suggest a good next read.'
  ]),
  replyRule('adopt-pet', ['should i adopt a pet', 'adopt a pet'], [
    'Pets are wonderful, but they need time, money, space, and long-term care. What pet are you considering and what is your daily schedule like?',
    'If you have the budget, stable housing, and time for daily care, adoption can be great. Let us check the practical side first.'
  ]),
  replyRule('red-or-blue', ['red or blue', 'blue or red'], [
    'Blue.',
    'I pick blue. Calm, clean, dependable.'
  ]),
  replyRule('event-choice', ['should i go to the event', 'go to the event'], [
    'If the event gives you connection, learning, or a real break, go. If you are exhausted or it costs too much, skip it without guilt.',
    'Tell me the event, cost, timing, and why you are unsure. I will help you decide.'
  ]),
  replyRule('workout', ['should i work out', 'workout today'], [
    'If you are not sick or injured, even a short walk or stretch is worth it. Keep it light if you are tired.',
    'Listen to your body. Energy available? Move a little. Pain or illness? Rest.'
  ]),
  replyRule('truth', ['should i tell them the truth', 'tell them the truth'], [
    'Usually yes, but delivery matters. Be honest, calm, and specific without being cruel.',
    'Truth is usually cleaner long-term. What is the situation? I can help phrase it.'
  ]),
  replyRule('forgive', ['should i forgive', 'forgive them'], [
    'Forgiveness can give you peace, but it does not mean removing boundaries. What happened?',
    'You can forgive and still protect yourself. Let us think through the boundary you need.'
  ]),
  replyRule('laptop-frozen', ['laptop froze', 'computer froze', 'screen froze'], [
    'Try Ctrl + Shift + Esc on Windows to open Task Manager, or hold the power button for about 10 seconds if it is fully locked.',
    'Give it a minute first. If it stays frozen, force restart and check autosave afterward.'
  ]),
  replyRule('phone-water', ['phone in water', 'dropped my phone in water', 'water damage'], [
    'Turn it off immediately. Remove the case and SIM if possible, dry the outside, and use silica gel packs. Avoid rice and do not charge it yet.',
    'Power it down now. The danger is electricity through wet circuits, so do not test or charge it until it is fully dry.'
  ]),
  replyRule('power-out', ['power went out', 'blackout'], [
    'Check if neighbors also lost power. If only your place is out, look for a tripped breaker if it is safe to do so.',
    'Use a phone light, avoid candles near flammable things, and check whether the outage is building-wide or just your unit.'
  ]),
  replyRule('locked-out', ['locked myself out', 'locked out of my house'], [
    'Check safe alternate entry points, then call a roommate, landlord, property manager, or a certified locksmith.',
    'That is stressful. First confirm every door/window you can safely access, then contact someone with a key.'
  ]),
  replyRule('deleted-file', ['deleted an important file', 'accidentally deleted', 'recover file'], [
    'Check Recycle Bin or Trash first. If it is not there, stop saving new files to that drive and use a recovery tool quickly.',
    'Look in Trash/Recycle Bin immediately. If it was emptied, avoid writing new data before recovery.'
  ]),
  replyRule('wifi', ['wifi keeps dropping', 'wi fi keeps dropping', 'internet keeps dropping'], [
    'Restart your router and modem for 30 seconds. If it continues, check router placement, interference, and firmware updates.',
    'Move closer to the router, restart it, and see if other devices have the same issue.'
  ]),
  replyRule('spill', ['spilled coffee', 'spilled water on keyboard', 'keyboard spill'], [
    'Unplug it immediately, flip it upside down over a towel, and let it dry completely before testing.',
    'Cut power first. Then drain and dry it. Do not keep typing on it while wet.'
  ]),
  replyRule('car-click', ['car wont start', 'car won t start', 'click when i turn the key'], [
    'Rapid clicking usually means a weak or dead battery. Try a jump start or a battery booster.',
    'That click often points to low battery voltage. Jumper cables or a booster pack are the next step.'
  ]),
  replyRule('goodbye-trained', ['goodbye', 'talk to you later', 'see ya', 'peace out', 'signing off'], [
    'Goodbye. Come back anytime you want help with JumpTake or anything practical.',
    'Talk to you later. I will be here when you need the next step.'
  ]),
  replyRule('sleep', ['going to sleep', 'go to sleep', 'sleep now'], [
    'Sleep well. I will be here when you come back.',
    'Good call. Rest up, and we can pick this back up later.'
  ]),
  replyRule('clear-history', ['clear history', 'clear chat', 'clear history and close'], [
    'You can clear the chat from the settings menu. After that, we will start fresh.',
    'Sure. Use clear chat in the settings menu and I will treat the next message like a new conversation.'
  ])
];

const findTrainedAssistantAnswer = (message) => {
  const normalized = normalizeText(message);
  if (!normalized) {
    return '';
  }

  const rule = TRAINED_REPLY_RULES.find(({ test }) => test(normalized));
  return rule ? pickVariation(message, rule.responses) : '';
};

const SECTION_KEYWORDS = {
  candidate: [
    ['notifications', /\b(notification|notifications|alerts?)\b/],
    ['settings', /\b(settings?|preferences?|account settings|security)\b/],
    ['profile', /\b(profile|my profile|candidate profile)\b/],
    ['resume-playground', /\b(resume playground|resume editor|resume builder|cv editor|cv builder|resume section)\b/],
    ['job-feed', /\b(job feed|jobs feed|job posts|jobs?|roles?|open jobs|browse jobs)\b/],
    ['applications', /\b(my applications|applications?|applied jobs?)\b/],
    ['assessments', /\b(assessments?|tests?|quizzes?)\b/],
    ['video-interviews', /\b(video interviews?|interviews?)\b/],
    ['draft-applications', /\b(draft applications?|drafts?)\b/],
    ['bookmarked-jobs', /\b(bookmarked jobs?|saved jobs?)\b/],
    ['saved-posts', /\b(saved posts?|saved feed)\b/],
    ['view-candidates', /\b(view candidates|candidates|candidate network|talent pool)\b/],
    ['friend-invitations', /\b(friends?|friend invitations?|connections?)\b/],
    ['bookmarked-candidates', /\b(bookmarked candidates?|saved candidates?)\b/],
    ['interested-jobs', /\b(job preferences?|interests?|interested jobs?)\b/],
    ['progress-check', /\b(progress check|analytics|performance)\b/],
    ['about-jumptake', /\b(about jumptake|about)\b/],
    ['inbox', /\b(inbox|messages?|chat)\b/],
    ['home', /\b(home|dashboard)\b/]
  ],
  employer: [
    ['notifications', /\b(notification|notifications|alerts?)\b/],
    ['settings', /\b(settings?|preferences?|account settings|security)\b/],
    ['company-profile', /\b(company profile|profile|company info|company information)\b/],
    ['create-document', /\b(create document|document editor|documents?|letters?|memos?|polic(?:y|ies))\b/],
    ['home-feed', /\b(home feed|work news|feed|company posts?|my company posts?)\b/],
    ['post-job', /\b(post job|create job|new job|job posting)\b/],
    ['manage-jobs', /\b(manage jobs?|job management|applications?|applicants?)\b/],
    ['make-assessment', /\b(make assessment|create assessment|assessment builder|new assessment)\b/],
    ['general-assessment', /\b(general assessments?|assessment library)\b/],
    ['talent-pool', /\b(talent pool|candidates|candidate search|browse talent)\b/],
    ['bookmarked-talents', /\b(bookmarked talents?|saved talents?|bookmarked candidates?)\b/],
    ['saved-posts', /\b(saved posts?|saved feed)\b/],
    ['application-tracking', /\b(application tracking|analytics|performance|progress check)\b/],
    ['about-jumptake', /\b(about jumptake|about)\b/],
    ['inbox', /\b(inbox|messages?|chat)\b/],
    ['home', /\b(home|dashboard)\b/]
  ]
};

const inferSectionAction = (normalized, context = {}) => {
  const hasNavigationVerb = /\b(open|go to|goto|take me to|show|visit|navigate|switch to|move to|bring me to|launch)\b/.test(normalized);
  const portalMode = context?.portalMode === 'employer' ? 'employer' : 'candidate';
  const sections = SECTION_KEYWORDS[portalMode] || [];
  const compactCommand = normalized.trim();
  const isShortSectionCommand = compactCommand.split(/\s+/).filter(Boolean).length <= 4;

  for (const [section, pattern] of sections) {
    if (
      (hasNavigationVerb && pattern.test(normalized))
      || compactCommand === section
      || (isShortSectionCommand && pattern.test(compactCommand))
    ) {
      return `open-section:${section}`;
    }
  }

  return null;
};

const inferAction = (message, context = {}) => {
  const normalized = String(message || '').toLowerCase();
  const mentionsCandidate = /\b(candidate|job seeker|jobseeker)\b/.test(normalized);
  const mentionsEmployer = /\b(employer|company|recruiter)\b/.test(normalized);
  const portalMode = context?.portalMode || '';
  const currentSection = String(context?.activeSection || '').toLowerCase();
  const actionVerbPattern = /\b(open|start|create|make|build|generate|write|draft|compose|prepare|set up|setup)\b/;
  const asksRegister = /\b(register|registration|sign ?up|join)\b/.test(normalized)
    || /\b(create|make|open|start|set ?up|setup|get)\b.{0,24}\b(account|profile)\b/.test(normalized);
  const asksLogin = /\b(log ?in|login|sign ?in)\b/.test(normalized);
  const asksJobs = /\b(job feed|jobs feed|browse jobs|open jobs|show jobs|job posts|find jobs)\b/.test(normalized);
  const asksResume = /\b(make|create|build|generate|write|draft)\b.{0,36}\b(resume|cv)\b/.test(normalized)
    || /\b(resume|cv)\b.{0,24}\b(make|create|build|generate|write|draft)\b/.test(normalized);
  const asksResumeFormat = /\b(format|style|design|align|fix|polish|make)\b.{0,44}\b(resume|cv)\b/.test(normalized)
    || (currentSection === 'resume-playground' && /\b(format|style|design|align|fix|polish|a4|template)\b/.test(normalized));
  const asksDocument = /\b(make|create|build|generate|write|draft)\b.{0,36}\b(document|letter|offer letter|policy|memo)\b/.test(normalized);
  const asksDocumentFormat = /\b(format|style|design|align|fix|polish|make)\b.{0,44}\b(document|letter|memo|policy)\b/.test(normalized)
    || (currentSection === 'create-document' && /\b(format|style|design|align|fix|polish|a4|template)\b/.test(normalized));
  const asksApply = /\b(apply|application)\b/.test(normalized) && /\b(job|role|position|posting)\b/.test(normalized);
  const asksStory = actionVerbPattern.test(normalized)
    && (
      /\b(create|make|write|draft|generate|compose|prepare)\b.{0,44}\b(talent story|story|stories|talent post|feed post|post composer|social post)\b/.test(normalized)
      || /\b(talent story|story|stories|talent post|feed post|post composer|social post)\b.{0,44}\b(create|make|write|draft|generate|compose|prepare)\b/.test(normalized)
    );
  const asksEmployerPost = actionVerbPattern.test(normalized)
    && (
      /\b(create|make|write|draft|generate|compose|prepare)\b.{0,44}\b(company post|work news|feed post|post|announcement)\b/.test(normalized)
      || /\b(company post|work news|feed post|post|announcement)\b.{0,44}\b(create|make|write|draft|generate|compose|prepare)\b/.test(normalized)
    );
  const asksAssessment = /\b(make|create|write|draft|generate|compose|prepare)\b.{0,36}\b(assessment|test|quiz|screening)\b/.test(normalized)
    || /\bassessment\b.{0,36}\b(candidate|general|job)\b/.test(normalized);
  const sectionAction = inferSectionAction(normalized, context);

  if (asksResumeFormat && portalMode !== 'employer') return 'candidate-format-resume';
  if (asksDocumentFormat && portalMode === 'employer') return 'employer-format-document';
  if (asksResume) return 'candidate-create-resume';
  if (asksApply) return 'candidate-apply-job';
  if ((asksEmployerPost || asksStory) && portalMode === 'employer') return 'employer-create-post';
  if (asksStory) return 'candidate-create-story';
  if (asksAssessment) return 'employer-create-assessment';
  if (asksDocument) return 'employer-create-document';
  if (sectionAction) return sectionAction;

  if (asksRegister && mentionsCandidate) return 'candidate-register';
  if (asksRegister && mentionsEmployer) return 'employer-register';
  if (asksLogin && mentionsCandidate) return 'candidate-login';
  if (asksLogin && mentionsEmployer) return 'employer-login';
  if (asksJobs) return 'open-jobs';
  if (asksRegister) return 'choose-register';
  if (asksLogin) return 'choose-login';
  return null;
};

const PORTAL_ACTIONS = new Set([
  'candidate-create-resume',
  'candidate-format-resume',
  'candidate-apply-job',
  'candidate-create-story',
  'employer-create-post',
  'employer-create-assessment',
  'employer-create-document',
  'employer-format-document'
]);

const isPortalAction = (action) => PORTAL_ACTIONS.has(action);

const truncateAssistantText = (value, maxLength = 1200) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
};

const pickCompactFields = (source = {}, fields = [], maxLength = 900) => (
  fields.reduce((compact, field) => {
    const value = source?.[field];
    if (value === undefined || value === null || value === '') {
      return compact;
    }

    compact[field] = typeof value === 'string' ? truncateAssistantText(value, maxLength) : value;
    return compact;
  }, {})
);

const buildHistoryBlock = (history = []) => (
  history
    .filter((entry) => entry && typeof entry.text === 'string' && entry.text.trim())
    .slice(-5)
    .map((entry) => `${entry.role === 'assistant' ? 'Assistant' : 'Visitor'}: ${truncateAssistantText(entry.text, 700)}`)
    .join('\n')
);

const buildCompactPortalContext = (context = {}) => {
  const workspace = context.workspace && typeof context.workspace === 'object' ? context.workspace : {};

  return {
    portalMode: context.portalMode || '',
    activeSection: context.activeSection || '',
    user: pickCompactFields(context.user, ['id', 'email', 'name', 'jumptakeId', 'jobInterests'], 500),
    profile: pickCompactFields(context.profile, [
      'name',
      'email',
      'jumptakeId',
      'skills',
      'education',
      'experience',
      'achievements',
      'interests',
      'hobbies',
      'summary',
      'bio',
      'resumeText'
    ], 1500),
    company: pickCompactFields(context.company, ['name', 'industry', 'headquarters', 'website', 'description'], 900),
    workspace: {
      mode: workspace.mode || '',
      title: truncateAssistantText(workspace.title, 180),
      currentText: truncateAssistantText(workspace.currentText || workspace.text || workspace.content, 3500),
      selectedTemplate: truncateAssistantText(workspace.selectedTemplate || workspace.template, 180),
      layout: workspace.layout && typeof workspace.layout === 'object'
        ? pickCompactFields(workspace.layout, ['pageWidth', 'pageHeight', 'margin', 'safePageHeight', 'pageCount', 'viewportWidth'], 120)
        : null
    },
    jobs: Array.isArray(context.jobs) ? context.jobs.slice(0, 6).map((job) => ({
      id: job?._id || job?.id || job?.jobNumber || '',
      title: truncateAssistantText(job?.title, 120),
      company: truncateAssistantText(job?.company?.name || job?.companyName, 120),
      description: truncateAssistantText(job?.description || job?.summary, 700),
      requirements: Array.isArray(job?.requirements)
        ? job.requirements.slice(0, 5).map((item) => truncateAssistantText(item, 160))
        : truncateAssistantText(job?.requirements, 700),
      location: truncateAssistantText(job?.location, 120),
      type: truncateAssistantText(job?.type || job?.jobType, 80)
    })) : []
  };
};

const normalizeDraftList = (value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap(normalizeDraftList)
      .map((item) => String(item || '').trim())
      .filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(/[\n,;|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const getProfileDisplayName = (context = {}) => {
  const profile = context.profile || {};
  const user = context.user || {};
  return String(
    profile.name
    || user.name
    || profile.fullName
    || user.email
    || 'Your Name'
  ).trim();
};

const getTargetRole = (message = '', context = {}) => {
  const interests = normalizeDraftList(context.user?.jobInterests || context.profile?.interests);
  const messageMatch = String(message || '').match(/\b(?:for|as|as a|as an)\s+([a-z][a-z\s-]{2,60})/i);
  return String(messageMatch?.[1] || interests[0] || context.profile?.targetRole || 'Target Role').trim();
};

const buildResumeActionDraft = (message = '', context = {}) => {
  const profile = context.profile || {};
  const name = getProfileDisplayName(context);
  const email = String(profile.email || context.user?.email || '').trim();
  const role = getTargetRole(message, context);
  const skills = normalizeDraftList(profile.skills).slice(0, 12);
  const education = normalizeDraftList(profile.education || profile.degrees).slice(0, 5);
  const experience = normalizeDraftList(profile.experience).slice(0, 6);
  const achievements = normalizeDraftList(profile.achievements).slice(0, 5);
  const summarySkills = skills.length ? skills.slice(0, 4).join(', ') : 'communication, problem solving, teamwork, and adaptability';

  return [
    name.toUpperCase(),
    [email, role].filter(Boolean).join(' | '),
    '',
    'PROFESSIONAL SUMMARY',
    `Motivated ${role} candidate with strengths in ${summarySkills}. Brings a practical, growth-focused approach to learning, collaboration, and delivering reliable work. Ready to contribute to teams that value initiative, clear communication, and continuous improvement.`,
    '',
    'CORE SKILLS',
    ...(skills.length
      ? skills.map((skill) => `- ${skill}`)
      : [
        '- Communication',
        '- Teamwork',
        '- Problem solving',
        '- Time management',
        '- Adaptability'
      ]),
    '',
    'EXPERIENCE',
    ...(experience.length
      ? experience.map((item) => `- ${item}`)
      : [
        `- Built practical experience relevant to ${role} through projects, coursework, training, or self-directed learning.`,
        '- Worked on tasks requiring attention to detail, organization, and clear communication.',
        '- Improved skills by learning from feedback and applying new knowledge quickly.'
      ]),
    '',
    'EDUCATION',
    ...(education.length
      ? education.map((item) => `- ${item}`)
      : ['- Add your school, college, degree, or certification here.']),
    '',
    'ACHIEVEMENTS',
    ...(achievements.length
      ? achievements.map((item) => `- ${item}`)
      : [
        '- Add measurable achievements, awards, projects, or leadership examples here.',
        '- Highlight results with numbers where possible, such as time saved, people helped, or quality improved.'
      ])
  ].join('\n');
};

const buildStoryActionDraft = (message = '', context = {}) => {
  const profile = context.profile || {};
  const name = getProfileDisplayName(context);
  const role = getTargetRole(message, context);
  const skills = normalizeDraftList(profile.skills).slice(0, 4);
  const skillText = skills.length ? skills.join(', ') : 'learning, creativity, and consistent effort';

  return [
    `Today I’m sharing a little part of my career journey as ${name}.`,
    '',
    `I’m continuing to grow toward opportunities in ${role}, and I’ve been building my confidence through ${skillText}. Every project, challenge, and conversation teaches me something useful about how to work better, communicate clearly, and keep improving.`,
    '',
    'I’m excited to connect with people who are learning, building, hiring, or exploring new opportunities. If you are on a similar path, let’s grow together and support each other’s next step.'
  ].join('\n');
};

const buildEmployerPostDraft = (message = '', context = {}) => {
  const company = context.company || {};
  const companyName = String(company.name || 'Our company').trim();
  return [
    `${companyName} is growing, and we’re excited to connect with talented people who want to do meaningful work.`,
    '',
    'We value curiosity, ownership, communication, and people who are ready to learn quickly. If you are exploring your next opportunity, keep an eye on our latest roles and updates here on JumpTake.',
    '',
    'We look forward to meeting candidates who are ready to bring fresh ideas and positive energy to the team.'
  ].join('\n');
};

const buildAssessmentDraft = (message = '', context = {}) => ([
  'Assessment Title: Candidate Skills Screening',
  '',
  'Instructions: Answer each question clearly. Use examples from your experience where possible.',
  '',
  '1. Tell us about a project or task you completed successfully. What was your role?',
  '2. Describe a time you solved a problem under pressure.',
  '3. Which skills make you a strong fit for this role?',
  '4. How do you organize your work when you have multiple deadlines?',
  '5. What tools, technologies, or methods have you used recently?',
  '6. Describe a time you received feedback. How did you respond?',
  '7. Why are you interested in this opportunity?',
  '',
  'Answer Key Guidance: Look for clear examples, relevant skills, ownership, communication, problem-solving, and evidence of learning.'
]).join('\n');

const buildDocumentDraft = (message = '', context = {}) => {
  const companyName = String(context.company?.name || 'Company Name').trim();
  return [
    `${companyName}`,
    '',
    'Document Draft',
    '',
    'Purpose',
    'This document outlines the key details, expectations, and next steps for the topic requested.',
    '',
    'Overview',
    'Add the main background, business context, and important points here. Keep the language clear, professional, and easy to follow.',
    '',
    'Key Points',
    '- Main point one',
    '- Main point two',
    '- Main point three',
    '',
    'Next Steps',
    '- Review the details',
    '- Confirm responsibilities',
    '- Share with the relevant people'
  ].join('\n');
};

const buildPortalActionFallbackDraft = (action, message = '', context = {}) => {
  switch (action) {
    case 'candidate-create-resume':
    case 'candidate-format-resume':
      return buildResumeActionDraft(message, context);
    case 'candidate-create-story':
      return buildStoryActionDraft(message, context);
    case 'employer-create-post':
      return buildEmployerPostDraft(message, context);
    case 'employer-create-assessment':
      return buildAssessmentDraft(message, context);
    case 'employer-create-document':
    case 'employer-format-document':
      return buildDocumentDraft(message, context);
    default:
      return '';
  }
};

const isWeakPortalActionDraft = (action, answer = '') => {
  if (!isPortalAction(action) || action === 'candidate-apply-job') {
    return false;
  }

  const text = String(answer || '').trim();
  const normalized = text.toLowerCase();

  if (text.length < 140) {
    return true;
  }

  if (/^(great|i can|let'?s|ready to|please|share|send|tell me|can you|could you|pick a|choose|what kind|which)\b/i.test(text)) {
    return true;
  }

  if (/\b(share your|send me|tell me your|tell me a bit more|can you please tell me|pick a genre|choose a genre|paste your|target job title)\b/i.test(normalized)) {
    return true;
  }

  return false;
};

const getLastHistoryEntry = (history = [], role) => (
  [...history]
    .reverse()
    .find((entry) => entry && entry.role === role && typeof entry.text === 'string' && entry.text.trim())
);

const extractKnowledgeTopic = (message) => {
  const source = String(message || '').trim();
  const normalized = source.toLowerCase();

  const patterns = [
    /^what is (?:a |an |the )?(.+)$/i,
    /^who is (.+)$/i,
    /^where is (.+)$/i,
    /^tell me about (.+)$/i,
    /^explain (.+)$/i
  ];

  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match?.[1]) {
      return match[1].trim();
    }
  }

  if (
    !inferAction(normalized)
    && /^[a-z0-9][a-z0-9\s,'-]{2,48}$/i.test(source)
    && /\b(banana|new york|london|paris|weather|movie|music|sports|bitcoin|crypto)\b/i.test(source)
  ) {
    return source.trim();
  }

  return '';
};

const lookupGeneralKnowledge = async (message) => {
  const topic = extractKnowledgeTopic(message);

  if (!topic) {
    return '';
  }

  const variants = [
    topic,
    topic.replace(/\?+$/, ''),
    topic.replace(/\s+/g, '_')
  ].filter(Boolean);

  for (const variant of [...new Set(variants)]) {
    try {
      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(variant)}`,
        {
          timeout: 7000,
          headers: {
            Accept: 'application/json'
          }
        }
      );

      const summary = String(response.data?.extract || '').trim();
      if (!summary) {
        continue;
      }

      return `${summary} If you want, I can also help you navigate JumpTake after that.`;
    } catch (error) {
      if (error.response?.status && error.response.status !== 404) {
        console.warn('[PUBLIC ASSISTANT] Knowledge lookup failed:', error.response.status);
      }
    }
  }

  return '';
};

const fallbackAnswer = (message, action, history = []) => {
  const normalized = String(message || '').toLowerCase();
  const priorConversation = Array.isArray(history) && history.length > 0;
  const lastAssistantText = String(getLastHistoryEntry(history, 'assistant')?.text || '').toLowerCase();
  const looksLikeCasualShortMessage = normalized.length <= 12 && /^[a-z0-9\s,'!?-]+$/i.test(normalized);
  const shortClarifier = /\b(what|why|how|huh|no|wait|again|really)\b/.test(normalized);

  if (action === 'choose-login') {
    return pickVariation(message, [
      'Would you like to log in as a candidate or an employer?',
      'Sure. Are you signing in as a job seeker or as an employer?',
      'Welcome back. Which portal should I open for you: candidate or employer?'
    ]);
  }
  if (action === 'choose-register') {
    return pickVariation(message, [
      'Which account would you like to create: candidate or employer?',
      'I can help with that. Are you joining to find work or to hire talent?',
      'Let’s get you registered. Do you need a candidate account or an employer account?'
    ]);
  }
  if (action === 'candidate-login') {
    return pickVariation(message, [
      'Opening candidate login. You can browse jobs, apply, track applications, complete assessments, and manage your profile.',
      'Candidate login coming up. Enter your details there and you’ll land in your job seeker workspace.',
      'Let’s get you back into the candidate portal. Use your registered email or username and password.'
    ]);
  }
  if (action === 'employer-login') {
    return pickVariation(message, [
      'Opening employer login. Employers can post jobs, manage applications, browse talent, and arrange assessments and interviews.',
      'Employer login coming up. Enter your company account details to access hiring tools.',
      'Let’s get you into the employer portal so you can manage jobs, candidates, interviews, and applications.'
    ]);
  }
  if (action === 'candidate-register') {
    return pickVariation(message, [
      'Opening candidate registration. Start by uploading your resume, then create your account and choose job preferences.',
      'Let’s build your candidate profile. Upload your resume first, then JumpTake can help match you with jobs.',
      'Ready to find your next role? Candidate registration starts with your resume and basic account details.'
    ]);
  }
  if (action === 'employer-register') {
    return pickVariation(message, [
      'Opening employer registration. Start by searching for your company or entering company information manually.',
      'Let’s set up your employer profile. Search your company first, or use manual registration if it is not listed.',
      'Ready to hire? Employer registration starts with your company name and business details.'
    ]);
  }
  if (action === 'open-jobs') {
    return 'Opening the public job feed. You can browse active jobs now, and candidate login is only needed when you want to open details or apply.';
  }
  if (String(action || '').startsWith('open-section:')) {
    const section = String(action).split(':')[1] || 'section';
    return `Opening ${section.replace(/-/g, ' ')}.`;
  }
  if (action === 'candidate-apply-job') {
    const genericApplyRequest = /\bapply\b.{0,16}\b(a|any|some|the)?\s*(job|role|position|posting)\b/.test(normalized)
      && !/\bdeveloper|engineer|designer|manager|analyst|assistant|intern|nurse|teacher|driver|sales|marketing|finance|account|support|remote|hybrid|full time|part time\b/.test(normalized);
    if (lastAssistantText.includes('which job') || !genericApplyRequest) {
      return 'Opening the matching job with your application draft prepared. Review the details, then tap Apply Now when you are ready.';
    }
    return 'Which job do you want to apply to? Send the job title or a few words from the post, and I will open it with your application draft ready.';
  }

  const trainedAnswer = findTrainedAssistantAnswer(message);
  if (trainedAnswer) {
    return trainedAnswer;
  }

  if (/\b(what('?s| is) your name|who are you)\b/.test(normalized)) {
    return "I'm JumpTake AI. Want to learn more about me?";
  }

  if (/\b(capital of germany|germany capital)\b/.test(normalized)) {
    return pickVariation(message, [
      'The capital of Germany is Berlin.',
      'That would be Berlin, Germany’s capital and largest city.',
      'Berlin. It is Germany’s capital and a major cultural, political, and tech hub.'
    ]);
  }

  if (/\b(yes|yeah|yep|sure|okay|ok|tell me more)\b/.test(normalized) && /learn more about me/.test(lastAssistantText)) {
    return "I'm JumpTake AI, your guide for the platform. I can help you explore jobs, explain portal pages, walk you through candidate or employer flows, and point you to the right next step.";
  }

  if (/\b(no|nope|nah)\b/.test(normalized) && /learn more about me/.test(lastAssistantText)) {
    return "No problem. I'm here whenever you want help with JumpTake, jobs, applications, resumes, hiring, or account setup.";
  }

  if (/\b(hi|hii|hello|helo|hey|hiya|yo|sup|good morning|good evening)\b/.test(normalized)) {
    return pickVariation(message, priorConversation
      ? [
        "Hey, I'm still with you. What would you like to do next?",
        'Hello again. Want help with jobs, resumes, accounts, or hiring?',
        'Hey. I’m here. Give me the next thing you want to figure out.'
      ]
      : [
        "Hey there. I'm JumpTake AI. I can help with jobs, accounts, resumes, hiring, portal pages, and how the platform works.",
        'Hello. I’m JumpTake AI, your guide for jobs, candidates, employers, resumes, and account setup.',
        'Hi. Tell me what you want to do on JumpTake and I’ll walk you through it.'
      ]);
  }

  if (/\b(how are you|how you doing|what'?s up|whats up|wyd)\b/.test(normalized)) {
    return pickVariation(message, [
      "I'm doing well and ready to help. Ask me about JumpTake, jobs, applications, resumes, hiring, or what you want to do next.",
      'All systems ready. What are we working on: job search, hiring, resumes, accounts, or a page tour?',
      'Doing great. I’m here to help you move through JumpTake without getting lost in the buttons.'
    ]);
  }

  if (/\b(thanks|thank you|cheers)\b/.test(normalized)) {
    return "You're welcome. If you want, I can help with the next step on JumpTake too.";
  }

  if (/\b(bye|goodbye|see you)\b/.test(normalized)) {
    return 'See you soon. Come back if you want help with JumpTake, jobs, hiring, or account setup.';
  }

  if (/\b(noob|newbie|beginner)\b/.test(normalized)) {
    return "No worries. If you're new to this, I can keep it simple and walk you through JumpTake step by step. Tell me whether you want the candidate side, employer side, jobs, or account setup.";
  }

  if (/\b(tour|show me around|how does jumptake work|how it works)\b/.test(normalized)) {
    return "Quick tour: public visitors can browse jobs, candidates can register, apply, build resumes, and track applications, and employers can register, post jobs, review applications, and search talent. Tell me which side you want to explore and I'll walk you through it.";
  }

  if (/\b(build|make|write|create).{0,20}\b(resume|cv)\b|\b(resume|cv).{0,20}(build|make|write|create)\b/.test(normalized)) {
    return pickVariation(message, [
      'I can help build your resume. Share your work history, education, skills, and the role you are targeting.',
      'Let’s craft a strong resume. Paste your old resume or list your recent jobs and top achievements.',
      'Ready to stand out? Tell me your target job title and your strongest skills, then I’ll help shape the resume.'
    ]);
  }

  if (/\b(cover letter|coverletter)\b/.test(normalized)) {
    return pickVariation(message, [
      'I can draft a cover letter. Send the job title, company name, and a short summary of your background.',
      'Paste the job description and your resume details, and I’ll tailor a cover letter for that role.',
      'Sure. Do you want it professional and direct, or more energetic and creative?'
    ]);
  }

  if (/\b(tailor|optimize|improve|rewrite).{0,30}\b(profile|bio|summary)\b|\b(profile|bio|summary).{0,30}\b(tailor|optimize|improve|rewrite)\b/.test(normalized)) {
    return pickVariation(message, [
      'I can tailor your profile. Share your current summary and the target role or industry.',
      'Let’s make your profile sharper. What are the top three skills or projects you want recruiters to notice?',
      'Send the job description you’re aiming for and I’ll help align your profile with the right keywords.'
    ]);
  }

  if (/\b(apple)\b/.test(normalized)) {
    return pickVariation(message, [
      'Apple can mean the fruit, or Apple Inc., the company behind iPhone, Mac, iPad, and iOS.',
      'Are we talking about the snack or the tech company? I can explain either one.',
      'Apple is both a common fruit and a major technology company founded by Steve Jobs, Steve Wozniak, and Ronald Wayne.'
    ]);
  }

  if (/\b(help me|help|assist me|need help)\b/.test(normalized)) {
    return pickVariation(message, [
      'I’m here. Tell me what you’re trying to do and I’ll guide you step by step.',
      'You’ve got me. Do you need help with jobs, accounts, resumes, hiring, or something else?',
      'Signal received. What problem are we solving today?'
    ]);
  }

  if (/\b(math|calculate|calculator|solve|equation)\b/.test(normalized)) {
    return pickVariation(message, [
      'Math mode ready. Send the expression or numbers and I’ll calculate it.',
      'Give me the equation, percentage, or formula and I’ll work it out.',
      'I can do that. What calculation should I solve?'
    ]);
  }

  if (/\b(code|coding|program|script|debug)\b/.test(normalized)) {
    return pickVariation(message, [
      'I can help with code. What language are we using, and what should it do?',
      'Tell me the tech stack and the feature or bug, and I’ll help write or debug it.',
      'Ready to build. Describe the logic you need and I’ll shape the code.'
    ]);
  }

  if (/\b(joke|make me laugh)\b/.test(normalized)) {
    return pickVariation(message, [
      "Why don't scientists trust atoms? Because they make up everything.",
      "How many programmers does it take to change a lightbulb? None. That's a hardware problem.",
      'Why did the scarecrow win an award? Because he was outstanding in his field.'
    ]);
  }

  if (/\b(story|tell me a story)\b/.test(normalized)) {
    return pickVariation(message, [
      'I can tell you a story. Pick a genre: sci-fi, mystery, comedy, or career adventure.',
      'Once upon a time, a tiny idea applied for its dream job and somehow passed every interview. Want the full version?',
      'Give me a main character and a mood, and I’ll spin a short story for you.'
    ]);
  }

  if (/\b(dance|can you dance)\b/.test(normalized)) {
    return pickVariation(message, [
      'No physical legs here, but I can absolutely dance through text rhythm.',
      'Only in the data stream. My footwork is imaginary, but my timing is decent.',
      'I can’t dance physically, but I can make you a playlist or explain a dance step.'
    ]);
  }

  if (/\b(food|eat|hungry|meal|snack)\b/.test(normalized)) {
    return pickVariation(message, [
      'If you want comfort, pasta is a solid pick. If you want light and fresh, try a salad or grilled protein bowl.',
      'Depends on your mood. Are you craving savory, sweet, spicy, quick, or healthy?',
      'A good default: rice or bread, protein, vegetables, and something bright like lemon or sauce.'
    ]);
  }

  if (/\b(random question|ask me random|ask random)\b/.test(normalized)) {
    return pickVariation(message, [
      'Random question: If you could master one skill instantly, what would it be?',
      'Here’s one: would you rather work from a quiet cabin or a high-rise city office?',
      'Random one: if your life had a title this week, what would it be?'
    ]);
  }

  if (/\b(favor|favour|do me a favor|do me a favour)\b/.test(normalized)) {
    return pickVariation(message, [
      'Of course. Tell me the favor, and if it involves text, logic, coding, learning, jobs, or planning, I’ll help.',
      'Name it. I’ll do my best to make it easier.',
      'Sure. What do you need from me?'
    ]);
  }

  if (/\b(what next|next step|what should i do|help me start)\b/.test(normalized)) {
    return 'A good next step is either browsing the public job feed, creating an account, or logging in. If you want, I can point you to the candidate or employer side directly.';
  }

  if (/\bbanana\b/.test(normalized)) {
    return "A banana is a fruit. If you're done with snack talk, I can also help you explore JumpTake, jobs, resumes, applications, or hiring.";
  }

  if (/\bnew york\b/.test(normalized)) {
    return "New York is one of the best-known cities in the United States, famous for finance, media, culture, and a huge job market. If you want, I can switch us back to JumpTake and help with jobs or accounts too.";
  }

  if (/\b(what is|who is|where is|tell me about|explain)\b/.test(normalized)) {
    return "I can answer a bit of that too. Ask it again and I'll keep it short, then I can bring us back to JumpTake if you want.";
  }

  if (normalized.length <= 6 && /\b(ok|okay|cool|nice|hmm|huh|lol|lmao)\b/.test(normalized)) {
    return "Got you. I'm here when you want help with JumpTake or the next step.";
  }

  if (looksLikeCasualShortMessage && !(priorConversation && shortClarifier)) {
    return priorConversation
      ? "I'm here with you. Tell me what you want to do next on JumpTake, and I'll keep it simple."
      : "Hey. Tell me what you want help with on JumpTake, and I'll guide you.";
  }

  if (/\b(candidate|resume|application|assessment|interview|employer|company|hiring|talent|job|profile|portal)\b/.test(normalized)) {
    return "I can help with that. Tell me the exact page, action, or problem you want help with, and I'll keep it focused and practical.";
  }

  return priorConversation
    ? "I can stay with this. Ask me about the next step, a page, a job action, account setup, or anything you want to do on JumpTake."
    : 'I can help with JumpTake. Ask for a tour, a page explanation, jobs, account setup, or the next step.';
};

const GENERIC_DIRECT_REPLY_SET = new Set([
  "I'm here with you. Tell me what you want to do next on JumpTake, and I'll keep it simple.",
  "Hey. Tell me what you want help with on JumpTake, and I'll guide you.",
  "I can help with that. Tell me the exact page, action, or problem you want help with, and I'll keep it focused and practical.",
  "I can stay with this. Ask me about the next step, a page, a job action, account setup, or anything you want to do on JumpTake.",
  'I can help with JumpTake. Ask for a tour, a page explanation, jobs, account setup, or the next step.',
  "Got you. I'm here when you want help with JumpTake or the next step."
]);

const getDirectAssistantReply = (message, history = [], action = null) => {
  if (action) {
    return fallbackAnswer(message, action, history);
  }

  const logicAnswer = findLogicAnswer(message);
  if (logicAnswer) {
    return logicAnswer;
  }

  const trainedAnswer = findTrainedAssistantAnswer(message);
  if (trainedAnswer) {
    return trainedAnswer;
  }

  const contextualFallback = fallbackAnswer(message, action, history);
  if (contextualFallback && !GENERIC_DIRECT_REPLY_SET.has(contextualFallback)) {
    return contextualFallback;
  }

  if (shouldUseDirectAssistantReply(message, action)) {
    return contextualFallback;
  }

  return '';
};

const getOpenAIApiKey = () => (
  process.env.OPENAI_API_KEY
  || process.env.CHATGPT_API_KEY
  || process.env.OPENAI_SECRET_KEY
  || process.env.OPENAI_KEY
  || ''
).trim();

const getOpenAIModelCandidates = () => {
  const configured = String(process.env.OPENAI_MODEL || '').trim();
  const configuredLooksUsable = configured && !/^gpt-5\.\d/i.test(configured);
  return [...new Set([
    'gpt-4.1-mini',
    'gpt-4o-mini',
    'gpt-5',
    configuredLooksUsable ? configured : ''
  ].filter(Boolean))];
};

const getPreferredAssistantProvider = () => (
  String(
    process.env.PUBLIC_ASSISTANT_PROVIDER
    || process.env.AI_PROVIDER
    || 'openai'
  )
    .trim()
    .toLowerCase()
);

const getAssistantProviderOrder = () => {
  const preferred = getPreferredAssistantProvider();
  const hasOpenAI = Boolean(getOpenAIApiKey());
  const hasGemini = Boolean(getGeminiApiKey());

  if (preferred === 'gemini') {
    return [
      ...(hasGemini ? ['gemini'] : []),
      ...(hasOpenAI ? ['openai'] : [])
    ];
  }

  return [
    ...(hasOpenAI ? ['openai'] : []),
    ...(hasGemini ? ['gemini'] : [])
  ];
};

const extractOpenAIResponseText = (data) => {
  const directText = String(data?.output_text || '').trim();
  if (directText) {
    return directText;
  }

  const outputBlocks = Array.isArray(data?.output) ? data.output : [];
  const collected = outputBlocks
    .flatMap((block) => Array.isArray(block?.content) ? block.content : [])
    .map((part) => {
      if (typeof part?.text === 'string') {
        return part.text;
      }
      if (typeof part?.text?.value === 'string') {
        return part.text.value;
      }
      return '';
    })
    .join('')
    .trim();

  return collected;
};

const askOpenAIResponsesApi = async ({ apiKey, model, prompt, useWebSearch = false }) => {
  const payload = {
    model,
    input: prompt,
    max_output_tokens: 500
  };

  if (useWebSearch) {
    payload.tools = [{ type: 'web_search_preview' }];
    payload.tool_choice = 'auto';
  }

  const response = await axios.post(
    'https://api.openai.com/v1/responses',
    payload,
    {
      timeout: 12000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return extractOpenAIResponseText(response.data);
};

const askOpenAIChatCompletionsApi = async ({ apiKey, model, prompt }) => {
  const response = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    {
      model,
      temperature: 0.35,
      max_tokens: 500,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    },
    {
      timeout: 12000,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    }
  );

  return String(response.data?.choices?.[0]?.message?.content || '').trim();
};

const askOpenAIWithModel = async ({ apiKey, model, prompt, useWebSearch = false }) => {
  try {
    const responseText = await askOpenAIResponsesApi({ apiKey, model, prompt, useWebSearch });
    if (responseText) {
      return responseText;
    }
  } catch (error) {
    const message = String(error.response?.data?.error?.message || error.message || '');
    const shouldRetryWithoutSearch = useWebSearch && /web_search|tool|unsupported|invalid/i.test(message);

    if (shouldRetryWithoutSearch) {
      return askOpenAIWithModel({ apiKey, model, prompt, useWebSearch: false });
    }

    const shouldTryChatCompletions = /responses|output_text|max_output_tokens|unknown|not found|unsupported|model/i.test(message);
    if (!shouldTryChatCompletions) {
      throw error;
    }

    console.warn(`[PUBLIC ASSISTANT] Responses API failed for ${model}, retrying with chat completions:`, message);
  }

  return askOpenAIChatCompletionsApi({ apiKey, model, prompt });
};

const askOpenAI = async ({ prompt }) => {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    return '';
  }

  const enableWebSearch = process.env.OPENAI_ENABLE_WEB_SEARCH !== 'false';
  const models = getOpenAIModelCandidates();
  let lastError = null;

  for (const model of models) {
    try {
      const answer = await askOpenAIWithModel({
        apiKey,
        model,
        prompt,
        useWebSearch: enableWebSearch
      });

      if (answer) {
        return answer;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[PUBLIC ASSISTANT] OpenAI model ${model} failed:`, error.response?.data?.error?.message || error.message);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return '';
};

const getGeminiApiKey = () => String(process.env.GEMINI_API_KEY || '').trim();

const getGeminiModelCandidates = () => (
  [...new Set([
    String(process.env.GEMINI_MODEL || '').trim(),
    'gemini-2.0-flash',
    'gemini-1.5-flash'
  ].filter(Boolean))]
);

const askGemini = async ({ prompt }) => {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return '';
  }

  const models = getGeminiModelCandidates();
  let lastError = null;

  for (const model of models) {
    try {
      const response = await axios.post(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.35,
            maxOutputTokens: 500
          }
        },
        { timeout: 20000 }
      );

      const answer = response.data?.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || '')
        .join('')
        .trim();

      if (answer) {
        return answer;
      }
    } catch (error) {
      lastError = error;
      console.warn(`[PUBLIC ASSISTANT] ${model} failed:`, error.response?.data?.error?.message || error.message);
    }
  }

  if (lastError) {
    throw lastError;
  }

  return '';
};

const isQuotaError = (error) => {
  const message = String(error?.response?.data?.error?.message || error?.message || '').toLowerCase();
  return /quota|billing|rate limit|insufficient/i.test(message);
};

const getAiUnavailableReply = ({ openAiFailed = false, geminiFailed = false } = {}) => {
  if (openAiFailed || geminiFailed) {
    return 'I am having trouble reaching the live AI service right now. I can still help with JumpTake basics, navigation, resumes, jobs, and account steps. Try a shorter request, or try again in a moment.';
  }

  return '';
};

const shouldUseDirectAssistantReply = (message, action) => {
  const normalized = String(message || '').toLowerCase();

  if (action) {
    return true;
  }

  return /\b(hi|hii|hello|helo|hey|hiya|yo|sup|good morning|good evening|what'?s up|whats up|how are you|how you doing|wyd|what('?s| is) your name|who are you|thanks|thank you|cheers|bye|goodbye|see you|noob|newbie|beginner|tour|show me around|how does jumptake work|how it works|what next|next step|what should i do|help me start)\b/.test(normalized);
};

const askPublicAssistant = async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const context = req.body?.context && typeof req.body.context === 'object' ? req.body.context : {};

  if (!message) {
    return res.status(400).json({ error: 'Please enter a question.' });
  }

  let action = inferAction(message, context);
  const lastAssistantText = String(getLastHistoryEntry(history, 'assistant')?.text || '').toLowerCase();
  if (!action && /\bwhich job\b/.test(lastAssistantText) && context?.portalMode === 'candidate') {
    action = 'candidate-apply-job';
  }
  const shouldGeneratePortalDraft = isPortalAction(action) && action !== 'candidate-apply-job';
  const directReply = shouldGeneratePortalDraft
    ? ''
    : getDirectAssistantReply(message, history, action);
  if (directReply) {
    return res.json({ answer: directReply, action });
  }

  const conversationHistory = buildHistoryBlock(history);
  const contextBlock = JSON.stringify(buildCompactPortalContext(context), null, 2);
  const actionInstructions = isPortalAction(action) ? `
The current portal action is ${action}.
- For candidate-create-resume: write a complete resume draft using the provided user/profile context. Use clear section headings and concise bullet points. Use Portal context workspace.layout when present: fit the draft to the A4 editor size, margins, safe page height, and current viewport. Keep the resume compact, structured, and page-break friendly.
- For candidate-format-resume: rewrite the currently open resume from Portal context workspace.currentText into a polished, A4-ready resume. Use workspace.layout when present to respect the editor A4 width, height, margins, safe page height, and page count. Keep it concise enough for 1-2 pages, use clear section headings, strong alignment cues, ATS-friendly bullets, and do not invent facts.
- For employer-create-document: write a polished editable document draft based on the user's request and employer/company context.
- For employer-format-document: rewrite the currently open document from Portal context workspace.currentText into a polished, A4-ready business document. Use the company profile context for company name, industry, headquarters, website, and tone where relevant.
- For candidate-create-story: write a polished talent story/feed post ready to paste into the dashboard feed composer. Keep it first person when appropriate.
- For employer-create-post: write a polished Work News/company feed post ready to paste into the employer feed composer. Use company context and keep it publication-ready.
- For employer-create-assessment: create an assessment draft with a title, short instructions, and 5-8 questions. Include answer keys. Mix multiple-choice and short-answer when useful.
- For candidate-apply-job: if the user specified a recognizable job, name the likely job and say you are opening it with the application fields prepared. If not, ask which job title they want.
Return only the user-facing text draft or instruction, not JSON.
` : '';
  let openAiFailed = false;
  let geminiFailed = false;

  const prompt = `
You are JumpTake AI, a polished public assistant for JumpTake.
Use the product guide and trained Q&A context below for JumpTake, jobs, hiring, accounts, resumes, applications, assessments, interviews, candidates, employers, and portal questions.
For safe general questions outside JumpTake, answer naturally and briefly first, then gently offer to help with JumpTake if useful.
Be welcoming and practical. If the visitor asks what to do next, recommend either exploring public jobs, creating an account, or logging in.
If they ask for a tour, explain the relevant public, candidate, and employer areas in a short ordered tour.
You may also answer broader career, job-search, resume, hiring, and platform-guidance questions in a helpful concise way.
Do not repeat the same overview paragraph on every turn. Use the conversation history and answer the latest message directly.
If the visitor is making casual conversation, reply naturally but steer back toward JumpTake help.
If the visitor says hello, hi, hey, or another greeting, greet them back instead of giving a long product summary.
If the visitor asks your name, say you are JumpTake AI and ask whether they want to learn more.
If the visitor uses slang or casual language, interpret it naturally and reply like a polished support assistant.
Avoid repeating the phrase "JumpTake connects candidates and employers in one hiring platform" unless the visitor explicitly asks for the platform overview again.
Never claim an unavailable feature exists. Do not output URLs or JSON.
If the visitor just says hello, hey, hi, what is up, or asks a very short follow-up, reply to that naturally instead of switching topics.
If the visitor asks a general question like coin toss, banana, New York, food, jokes, or small talk, answer it naturally first, then gently offer JumpTake help if it fits.
If the visitor asks something unrelated and harmless, do not repeat a stock JumpTake paragraph. Keep the reply conversational and helpful.
If the visitor asks a logic or riddle question, answer that exact question directly.
If the visitor asks to create an account, log in, browse jobs, or take a product action, guide them into the correct JumpTake flow.
If a request needs missing personal details, ask for the missing details instead of pretending you have them.

${SITE_GUIDE}

${RESPONSE_PLAYBOOK}

Conversation so far:
${conversationHistory || 'No prior conversation.'}

Portal context:
${contextBlock}

${actionInstructions}

Visitor: ${message}
`;

  for (const provider of getAssistantProviderOrder()) {
    try {
      const answer = provider === 'gemini'
        ? await askGemini({ prompt })
        : await askOpenAI({ prompt });

      if (answer) {
        const actionDraft = isWeakPortalActionDraft(action, answer)
          ? buildPortalActionFallbackDraft(action, message, context)
          : '';
        return res.json({ answer: actionDraft || answer, action });
      }

      if (provider === 'gemini') {
        geminiFailed = true;
      } else {
        openAiFailed = true;
      }
    } catch (error) {
      if (provider === 'gemini') {
        geminiFailed = true;
      } else {
        openAiFailed = true;
      }
      console.warn(`[PUBLIC ASSISTANT] ${provider} failed:`, error.response?.data?.error?.message || error.message);
    }
  }

  const actionDraftFallback = buildPortalActionFallbackDraft(action, message, context);
  if (actionDraftFallback) {
    return res.json({ answer: actionDraftFallback, action });
  }

  const actionFallback = fallbackAnswer(message, action, history);
  if (actionFallback && actionFallback !== 'Error connecting') {
    return res.json({ answer: actionFallback, action });
  }

  const aiUnavailableReply = getAiUnavailableReply({
    openAiFailed,
    geminiFailed
  });

  if (aiUnavailableReply) {
    return res.json({ answer: aiUnavailableReply, action });
  }

  return res.json({ answer: 'Error connecting', action });
};

module.exports = {
  askPublicAssistant
};
