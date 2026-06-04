const { PrismaClient } = require('./prisma/generated/mysql');
const prisma = new PrismaClient();

async function seedInterviewTestData() {
    try {
        console.log('🌱 Starting to seed interview test data...\n');

        // Get company ID (use your actual company ID)
        const companyId = '71ab1ca7-271d-4e3a-b77c-72a51ddff454';

        console.log('📊 Company ID:', companyId);

        // 1. Create test jobs if they don't exist
        console.log('\n📝 Creating test jobs...');

        const job1 = await prisma.jobPosting.upsert({
            where: {
                id: 'test-job-frontend'
            },
            update: {},
            create: {
                id: 'test-job-frontend',
                companyId: companyId,
                title: 'مطور Frontend',
                department: 'تطوير البرمجيات',
                location: 'القاهرة - مصر',
                type: 'FULL_TIME',
                experienceLevel: 'MID',
                description: 'نبحث عن مطور Frontend محترف للعمل على مشاريع React و TypeScript',
                requirements: 'خبرة 3+ سنوات في React\nإجادة TypeScript\nمعرفة بـ TailwindCSS',
                responsibilities: 'تطوير واجهات المستخدم\nكتابة كود نظيف\nالعمل مع الفريق',
                status: 'ACTIVE',
                salaryMin: 8000,
                salaryMax: 15000
            }
        });
        console.log('✅ Created/Found job:', job1.title);

        const job2 = await prisma.jobPosting.upsert({
            where: {
                id: 'test-job-backend'
            },
            update: {},
            create: {
                id: 'test-job-backend',
                companyId: companyId,
                title: 'مطور Backend',
                department: 'تطوير البرمجيات',
                location: 'الإسكندرية - مصر',
                type: 'FULL_TIME',
                experienceLevel: 'SENIOR',
                description: 'مطلوب مطور Backend خبير في Node.js و PostgreSQL',
                requirements: 'خبرة 5+ سنوات في Node.js\nإجادة SQL\nمعرفة بـ Docker',
                responsibilities: 'تطوير APIs\nإدارة قواعد البيانات\nتحسين الأداء',
                status: 'ACTIVE',
                salaryMin: 12000,
                salaryMax: 20000
            }
        });
        console.log('✅ Created/Found job:', job2.title);

        // 2. Create test applicants
        console.log('\n👥 Creating test applicants...');

        const applicant1 = await prisma.applicant.upsert({
            where: {
                id: 'test-applicant-ahmed'
            },
            update: {},
            create: {
                id: 'test-applicant-ahmed',
                companyId: companyId,
                jobId: job1.id,
                name: 'أحمد محمد علي',
                email: 'ahmed.frontend@test.com',
                phone: '01012345678',
                status: 'REVIEWING',
                experience: 4,
                education: 'بكالوريوس علوم الحاسب',
                skills: 'React, TypeScript, TailwindCSS, Next.js',
                rating: 4
            }
        });
        console.log('✅ Created/Found applicant:', applicant1.name, '-', applicant1.email);

        const applicant2 = await prisma.applicant.upsert({
            where: {
                id: 'test-applicant-sara'
            },
            update: {},
            create: {
                id: 'test-applicant-sara',
                companyId: companyId,
                jobId: job1.id,
                name: 'سارة أحمد حسن',
                email: 'sara.frontend@test.com',
                phone: '01123456789',
                status: 'NEW',
                experience: 3,
                education: 'بكالوريوس هندسة',
                skills: 'React, JavaScript, CSS, HTML',
                rating: 5
            }
        });
        console.log('✅ Created/Found applicant:', applicant2.name, '-', applicant2.email);

        const applicant3 = await prisma.applicant.upsert({
            where: {
                id: 'test-applicant-mohamed'
            },
            update: {},
            create: {
                id: 'test-applicant-mohamed',
                companyId: companyId,
                jobId: job2.id,
                name: 'محمد خالد عبدالله',
                email: 'mohamed.backend@test.com',
                phone: '01234567890',
                status: 'REVIEWING',
                experience: 6,
                education: 'ماجستير علوم الحاسب',
                skills: 'Node.js, PostgreSQL, Docker, Redis',
                rating: 5
            }
        });
        console.log('✅ Created/Found applicant:', applicant3.name, '-', applicant3.email);

        const applicant4 = await prisma.applicant.upsert({
            where: {
                id: 'test-applicant-fatima'
            },
            update: {},
            create: {
                id: 'test-applicant-fatima',
                companyId: companyId,
                jobId: job2.id,
                name: 'فاطمة حسين علي',
                email: 'fatima.backend@test.com',
                phone: '01098765432',
                status: 'NEW',
                experience: 5,
                education: 'بكالوريوس علوم الحاسب',
                skills: 'Node.js, MySQL, Express, MongoDB',
                rating: 4
            }
        });
        console.log('✅ Created/Found applicant:', applicant4.name, '-', applicant4.email);

        // 3. Create a sample interview
        console.log('\n📅 Creating sample interview...');

        const sampleInterview = await prisma.interview.upsert({
            where: {
                id: 'test-interview-1'
            },
            update: {},
            create: {
                id: 'test-interview-1',
                companyId: companyId,
                applicantId: applicant1.id,
                jobId: job1.id,
                date: new Date('2026-02-10'),
                time: '10:00 AM',
                type: 'VIDEO',
                location: 'https://zoom.us/j/123456789',
                interviewers: 'أحمد السيد, سارة محمد',
                status: 'SCHEDULED',
                notes: 'مقابلة فنية - المرحلة الأولى'
            }
        });
        console.log('✅ Created/Found interview:', sampleInterview.id);

        console.log('\n✅ =============================================');
        console.log('✅ Test data seeding completed successfully!');
        console.log('✅ =============================================\n');

        console.log('📊 Summary:');
        console.log('   - Jobs created: 2');
        console.log('     1. مطور Frontend (test-job-frontend)');
        console.log('     2. مطور Backend (test-job-backend)');
        console.log('   - Applicants created: 4');
        console.log('     1. أحمد محمد علي (Frontend)');
        console.log('     2. سارة أحمد حسن (Frontend)');
        console.log('     3. محمد خالد عبدالله (Backend)');
        console.log('     4. فاطمة حسين علي (Backend)');
        console.log('   - Sample interviews: 1');
        console.log('     1. أحمد محمد علي - مقابلة فيديو (2026-02-10)');

        console.log('\n🚀 You can now test the interview scheduling feature!');
        console.log('   1. Go to: http://localhost:3007 (or your frontend URL)');
        console.log('   2. Navigate to: HR → التوظيف → المقابلات');
        console.log('   3. Click: "جدولة مقابلة"');
        console.log('   4. Select a job and applicant from the dropdowns');
        console.log('   5. Fill in the interview details');
        console.log('   6. Click: "جدولة المقابلة"');

        console.log('\n🔍 Debugging Tips:');
        console.log('   - Check browser console for frontend logs');
        console.log('   - Check server console for backend logs');
        console.log('   - Look for these debug markers:');
        console.log('     🔵 [Frontend] → Browser console');
        console.log('     📅 [Controller] → Server console');
        console.log('     📝 [Service] → Server console');

    } catch (error) {
        console.error('❌ Error seeding test data:', error);
        throw error;
    } finally {
        await prisma.$disconnect();
    }
}

seedInterviewTestData();
