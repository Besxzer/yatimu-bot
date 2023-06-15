require('dotenv').config();

const { SlashCommandBuilder } = require('discord.js');
const fs = require('fs')
const wait = require('node:timers/promises').setTimeout;

module.exports = {
	data: new SlashCommandBuilder()
		.setName('nic')
		.setDescription('play nameapic game')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('สร้างห้องเล่น name-a-pic')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('เข้าห้อง name-a-pic')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('start')
                .setDescription('เริ่มเกม name-a-pic (คนสร้างห้องพิมพ์เท่านั้น)')
        )
        .addSubcommand(subcommand =>
            subcommand
                .setName('send')
                .setDescription('ส่งชื่อเข้าประกวด name-a-pic')
                .addStringOption(option =>
                    option
                        .setName('name')
                        .setDescription('name')
                        .setRequired(true)
                )
        )    
        .addSubcommand(subcommand =>
            subcommand
                .setName('end')
                .setDescription('จบเกม name-a-pic')
        ),
	async execute(interaction) {

        const roomData = fs.readFileSync('./data.json', { encoding: 'utf8'});
        const room = JSON.parse(roomData)

        if(interaction.options.getSubcommand() === 'create' && room.status === null){
            const data = createUserData(interaction.member.id);
            createRoom(interaction,data);
        } 

        if(room.status === null){
            return;
        }
        
        if (interaction.options.getSubcommand() === 'join'){
            const data = createUserData(interaction.user.id);
            joinRoom(interaction,data);
        } 

        if(interaction.options.getSubcommand() === 'start' && interaction.user.id === room.owner){
            room.status = 'sendpic'
            room.giver = room.users[0].id
            room.round += 1
            fs.writeFileSync('data.json', JSON.stringify(room))
            interaction.reply(`<@${room.giver}> เลือกรูป`)
        }

        if(interaction.options.getSubcommand() === 'send' && interaction.user.id !== room.giver){
            sendName(interaction, interaction.options.getString('name'));
        }

        if(interaction.options.getSubcommand() === 'end' && interaction.user.id === room.owner){
            End();
            interaction.reply('End!')
        }
	},
};

function createUserData(id) {
    const data = {
        id, score: 0, name: null
    }
    return data
}

function createRoom(interaction,data) {
    const room = {
        users: [
            data
        ],
        shuffleNamers: [],
        round: 0,
        status: 'waiting',
        giver: null,
        owner: data.id,
        isSendPic: false,
        send: 0
    }
    interaction.reply(`
    >>> ### players
        - <@${data.id}>
    `)
    console.log(JSON.stringify(room))
    fs.writeFileSync("data.json", JSON.stringify(room))
}

function joinRoom(interaction,data) {
    const roomData = fs.readFileSync('./data.json', { encoding: 'utf8'});
    const room = JSON.parse(roomData)
    const users = room.users
    const users_id = room.users.map(user => { return user.id })
    if(!users_id.includes(data.id)){
        users.push(data);
    }
    const showUsers = users.map((user) => {
        return `\n- <@${user.id}>`
    })

    interaction.reply(`
    >>> ## players
    ${showUsers.join(' ')}
    `)
    fs.writeFileSync('data.json', JSON.stringify(room))
}

async function sendName(interaction, name) {
    const roomData = fs.readFileSync('./data.json', { encoding: 'utf8'});
    const room = JSON.parse(roomData)
    const userData = room.users.find(data => data.id === interaction.member.id)
    userData.name = name
    room.send = room.send + 1;
    await interaction.reply(`${room.send}/${room.users.length - 1}`)

    if(room.send === room.users.length - 1) {
        const shuffleList = Shuffle(room.users)
        await wait(500)
        const namerList = shuffleList.filter((user) => {
            return user.name !== null
        })
        const show = namerList.map((user, index) => {
            return `\n${index+1}. ${user.name}`
        })
        const vote = await interaction.followUp({
            content: `
                ✍️มาโหวตกันเถอะ✍️ (กด emote หมายเลขที่คุณชื่นชอบ)
                ${show.join('')}
            `,fetchReply: true
        })
        const emoji = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣']
        for(i in show){
            await vote.react(emoji[i])
        }
        room.status = "vote";
        room.shuffleNamers = namerList;
    }
    fs.writeFileSync('data.json', JSON.stringify(room))
}

function Shuffle(list) {
    const shuffleList = [...list];
    for (let i = shuffleList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffleList[i], shuffleList[j]] = [shuffleList[j], shuffleList[i]];
    }
    return shuffleList
}

function End() {
    const roomData = fs.readFileSync('./data.json', { encoding: 'utf8'});
    const room = JSON.parse(roomData)
    room.status = null
    fs.writeFileSync('data.json', JSON.stringify(room))
}