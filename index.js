require('dotenv').config();
const fs = require('node:fs');
const path = require('node:path');


const { Client, Collection, GatewayIntentBits, Partials, Events } = require('discord.js');

const token = process.env.DISCORD_TOKEN

// Create a new client instance
const client = new Client({ 
	intents: [
		GatewayIntentBits.Guilds, 
		GatewayIntentBits.GuildMessages, 
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMessageReactions
	],
	partials: [
			Partials.Message, 
			Partials.Channel, 
			Partials.Reaction
	]
 });

client.login(token);

client.commands = new Collection();

const commandsPath = path.join(__dirname, '/commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for(const file of commandFiles){
	const filePath = path.join(commandsPath, file);
	const command = require(filePath);
	if ('data' in command && 'execute' in command) {
		client.commands.set(command.data.name, command);
	} else {
		console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
	}
}

client.on(Events.InteractionCreate, interaction => {
	const command = interaction.client.commands.get(interaction.commandName);
	command.execute(interaction);
});

client.on(Events.MessageCreate, message => {
	const roomData = fs.readFileSync('./data.json', { encoding: 'utf8'});
    const room = JSON.parse(roomData)
	console.log(message.author.id)
	if(message.author.id === room.giver && !room.isSendPic) {
		room.status = 'naming'
		room.isSendPic = true
		fs.writeFileSync('data.json', JSON.stringify(room))
		message.reply(`ใส่ชื่อได้เลย`)
	} 

})

client.on(Events.MessageReactionAdd, async (reaction, user) => {
	const nameAPicVoteEmoji = {
		'1️⃣' : 1,
		'2️⃣' : 2,
		'3️⃣' : 3,
		'4️⃣' : 4,
		'5️⃣' : 5,
		'6️⃣' : 6,
		'7️⃣' : 7,
		'8️⃣' : 8,
		'9️⃣' : 9
	}
	const roomData = fs.readFileSync('./data.json', { encoding: 'utf8'});
    const room = JSON.parse(roomData);
	const emoji = reaction.emoji.name;
	//for name a pic game 
	if(user.id === room.giver && room.status === 'vote' && Object.keys(nameAPicVoteEmoji).includes(emoji)){
		room.status = "result"
		const number = nameAPicVoteEmoji[emoji] - 1;
		const winner = room.shuffleNamers[number];
		const channel = client.channels.cache.get(reaction.message.channelId)

		const realWinner = room.users.find((user) => user.id === winner.id)
		realWinner.score += 1

		const sortedUsers = room.users.sort((a, b) => {
			return b.score - a.score
		} )

		const scoreboard = sortedUsers.map((user) => {
			return `\n- <@${user.id}> : ${user.score} (${user.name !== null ? user.name : 'คนส่งรูป'})`
		})

		if(room.status === 'result'){
			channel.send(`
				## Winner is <@${realWinner.id}>! และจะเป็นคนเลือกรูปรอบต่อไป

				### Score 
				${scoreboard.join('')}

			<@${realWinner.id}>! เลือกรูปต่อไปได้เลย
		`)
		newRound(winner,room)
		}

	}
})


function newRound(winner ,room) {
	room.shuffleNamers = []
	room.users.forEach(user => {
		user.name = null
	});
	room.status = 'end'
	room.isSendPic = false
	room.round += 1
	room.send = 0
	room.giver = winner.id
	fs.writeFileSync('data.json', JSON.stringify(room))
}

