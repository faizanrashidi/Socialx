"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('Seeding SocialX database...');
    const passwordHash = await bcryptjs_1.default.hash('Password123!', 10);
    // 1. Create Admin
    const admin = await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: {
            email: 'admin@socialx.internal',
            username: 'admin',
            passwordHash,
            role: 'ADMIN',
            profile: {
                create: {
                    displayName: 'SocialX Official',
                    avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
                    bio: 'Official platform news and updates for SocialX.',
                    website: 'https://socialx.app',
                    location: 'San Francisco, CA',
                },
            },
        },
    });
    // 2. Create Sample Creators
    const creators = [
        {
            username: 'maya_lens',
            email: 'maya@example.com',
            name: 'Maya Chen',
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
            bio: 'Visual artist & travel photographer 📷✨ Chasing sunsets and golden hour.',
            posts: [
                {
                    caption: 'Golden hour in the Mediterranean coast 🌊 #photography #travel #sunsets',
                    mediaUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800',
                },
                {
                    caption: 'Neon alleyways through Tokyo at night 🏮 #neon #nightlife #japan',
                    mediaUrl: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=800',
                },
            ],
            reel: {
                caption: 'Speed editing workflow in Lightroom Mobile! ⚡ #creative #tutorial',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
                thumbnailUrl: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800',
            },
        },
        {
            username: 'alex_dev',
            email: 'alex@example.com',
            name: 'Alex Rivera',
            avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
            bio: 'Mobile dev & tech tinkerer. Building modern Android apps with Jetpack Compose 🚀',
            posts: [
                {
                    caption: 'Workspace essentials for 2026. Clean setup, focused code! 💻 #technology #developer #workspace',
                    mediaUrl: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800',
                },
            ],
            reel: {
                caption: 'Quick tips for smooth Compose animations! 📱✨ #android #kotlin',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
                thumbnailUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=800',
            },
        },
        {
            username: 'serena_vibes',
            email: 'serena@example.com',
            name: 'Serena Vance',
            avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200',
            bio: 'Fashion designer, music curator & coffee lover ☕ #lifestyle',
            posts: [
                {
                    caption: 'Morning espresso and moodboards 🎨☕ #aesthetic #minimal #fashion',
                    mediaUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800',
                },
            ],
            reel: {
                caption: 'Autumn wardrobe styling session 🍂🧥 #style #fashioninspo',
                videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4',
                thumbnailUrl: 'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?w=800',
            },
        },
    ];
    for (const c of creators) {
        const user = await prisma.user.upsert({
            where: { username: c.username },
            update: {},
            create: {
                username: c.username,
                email: c.email,
                passwordHash,
                profile: {
                    create: {
                        displayName: c.name,
                        avatarUrl: c.avatar,
                        bio: c.bio,
                        followerCount: 1420,
                        followingCount: 380,
                        postCount: c.posts.length,
                    },
                },
            },
        });
        // Create 24h Story
        await prisma.story.create({
            data: {
                authorId: user.id,
                mediaUrl: c.posts[0].mediaUrl,
                type: 'PHOTO',
                textOverlay: 'Good vibes only ✨',
                expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000), // 20h remaining
            },
        });
        // Create Posts
        for (const p of c.posts) {
            await prisma.post.create({
                data: {
                    authorId: user.id,
                    caption: p.caption,
                    likeCount: 148,
                    commentCount: 12,
                    media: {
                        create: [{ url: p.mediaUrl, order: 0 }],
                    },
                },
            });
        }
        // Create Reel
        await prisma.reel.create({
            data: {
                authorId: user.id,
                caption: c.reel.caption,
                videoUrl: c.reel.videoUrl,
                thumbnailUrl: c.reel.thumbnailUrl,
                audioTitle: 'Original Audio - ' + c.name,
                likeCount: 890,
                commentCount: 45,
            },
        });
    }
    console.log('Seeding completed successfully!');
}
main()
    .catch((e) => {
    console.error(e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
