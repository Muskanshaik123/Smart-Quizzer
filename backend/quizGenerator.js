class QuizGenerator {
    constructor() {
        console.log('🤖 Dynamic Question Generator Active');
        this.questionCounters = {};
    }

    generateQuestions(topic, difficulty, numQuestions = 5) {
        console.log(`🎯 Generating ${numQuestions} ${difficulty} questions for ${topic}...`);
        
        const questions = [];
        
        for (let i = 0; i < numQuestions; i++) {
            const question = this.createDynamicQuestion(topic, difficulty, i);
            questions.push(question);
        }
        
        console.log(`✅ Generated ${questions.length} unique questions for ${topic}`);
        return questions;
    }

    createDynamicQuestion(topic, difficulty, questionIndex) {
        const topicGenerator = this.getTopicGenerator(topic);
        const { question, options, correctAnswer, explanation } = topicGenerator(difficulty, questionIndex);
        
        return {
            id: questionIndex + 1,
            question: question,
            type: 'multiple_choice',
            options: this.shuffleArray(options),
            correctAnswer: correctAnswer,
            explanation: explanation,
            difficulty: difficulty,
            topic: topic
        };
    }

    getTopicGenerator(topic) {
        const generators = {
            'Mathematics': this.generateMathQuestion,
            'Science': this.generateScienceQuestion,
            'History': this.generateHistoryQuestion,
            'Literature': this.generateLiteratureQuestion,
            'Geography': this.generateGeographyQuestion,
            'Computer Science': this.generateCSQuestion,
            'Physics': this.generatePhysicsQuestion,
            'Chemistry': this.generateChemistryQuestion,
            'Biology': this.generateBiologyQuestion
        };

        return generators[topic] || this.generateGeneralQuestion;
    }

    // 🧮 MATHEMATICS - Different math questions
    generateMathQuestion(difficulty, index) {
        const mathQuestions = [
            {
                question: `What is the result of ${this.getRandomNumber(10, 50)} + ${this.getRandomNumber(10, 50)}?`,
                options: [
                    this.getRandomNumber(80, 100),
                    this.getRandomNumber(20, 60),
                    this.getRandomNumber(60, 90),
                    this.getRandomNumber(30, 70)
                ],
                correctAnswer: null,
                explanation: 'Basic addition calculation'
            },
            {
                question: `Solve for x: ${this.getRandomNumber(2, 5)}x + ${this.getRandomNumber(5, 15)} = ${this.getRandomNumber(20, 40)}`,
                options: [
                    this.getRandomNumber(3, 8),
                    this.getRandomNumber(6, 12),
                    this.getRandomNumber(2, 7),
                    this.getRandomNumber(4, 10)
                ],
                correctAnswer: null,
                explanation: 'Linear equation solving'
            },
            {
                question: `What is the area of a rectangle with length ${this.getRandomNumber(5, 15)} and width ${this.getRandomNumber(3, 10)}?`,
                options: [
                    this.getRandomNumber(20, 60),
                    this.getRandomNumber(30, 80),
                    this.getRandomNumber(15, 45),
                    this.getRandomNumber(25, 75)
                ],
                correctAnswer: null,
                explanation: 'Area = length × width'
            },
            {
                question: `Calculate: ${this.getRandomNumber(8, 20)} × ${this.getRandomNumber(3, 12)} ÷ ${this.getRandomNumber(2, 6)}`,
                options: [
                    this.getRandomNumber(15, 40),
                    this.getRandomNumber(20, 50),
                    this.getRandomNumber(10, 30),
                    this.getRandomNumber(25, 60)
                ],
                correctAnswer: null,
                explanation: 'Multiplication and division'
            },
            {
                question: `What is ${this.getRandomNumber(60, 144)} ÷ ${this.getRandomNumber(4, 12)}?`,
                options: [
                    this.getRandomNumber(8, 20),
                    this.getRandomNumber(12, 25),
                    this.getRandomNumber(6, 15),
                    this.getRandomNumber(10, 22)
                ],
                correctAnswer: null,
                explanation: 'Division calculation'
            }
        ];

        const selected = { ...mathQuestions[index % mathQuestions.length] };
        const num1 = parseInt(selected.question.match(/\d+/g)[0]);
        const num2 = parseInt(selected.question.match(/\d+/g)[1]);
        
        // Calculate correct answer based on question type
        if (selected.question.includes('+')) {
            selected.correctAnswer = (num1 + num2).toString();
        } else if (selected.question.includes('×') && selected.question.includes('÷')) {
            const num3 = parseInt(selected.question.match(/\d+/g)[2]);
            selected.correctAnswer = Math.round((num1 * num2) / num3).toString();
        } else if (selected.question.includes('×')) {
            selected.correctAnswer = (num1 * num2).toString();
        } else if (selected.question.includes('÷')) {
            selected.correctAnswer = Math.round(num1 / num2).toString();
        } else if (selected.question.includes('area')) {
            selected.correctAnswer = (num1 * num2).toString();
        } else if (selected.question.includes('x')) {
            const result = Math.round((parseInt(selected.question.match(/\d+/g)[2]) - parseInt(selected.question.match(/\d+/g)[1])) / parseInt(selected.question.match(/\d+/g)[0]));
            selected.correctAnswer = result.toString();
        }

        // Set correct answer as first option and shuffle
        selected.options[0] = selected.correctAnswer;
        return selected;
    }

    // 🔬 SCIENCE - Different science questions
    generateScienceQuestion(difficulty, index) {
        const scienceQuestions = [
            {
                question: "What is the chemical symbol for Gold?",
                options: ["Au", "Ag", "Fe", "Cu"],
                correctAnswer: "Au",
                explanation: "Au comes from the Latin word 'aurum' meaning gold"
            },
            {
                question: "Which planet is known as the Red Planet?",
                options: ["Mars", "Venus", "Jupiter", "Saturn"],
                correctAnswer: "Mars",
                explanation: "Mars appears red due to iron oxide on its surface"
            },
            {
                question: "What is the atomic number of Carbon?",
                options: ["6", "12", "14", "8"],
                correctAnswer: "6",
                explanation: "Carbon has 6 protons in its nucleus"
            },
            {
                question: "What is the powerhouse of the cell?",
                options: ["Mitochondria", "Nucleus", "Ribosome", "Golgi Apparatus"],
                correctAnswer: "Mitochondria",
                explanation: "Mitochondria produce energy (ATP) for the cell"
            },
            {
                question: "Which gas do plants absorb during photosynthesis?",
                options: ["Carbon Dioxide", "Oxygen", "Nitrogen", "Hydrogen"],
                correctAnswer: "Carbon Dioxide",
                explanation: "Plants use CO₂ to produce glucose and oxygen"
            }
        ];

        return scienceQuestions[index % scienceQuestions.length];
    }

    // 📜 HISTORY - Different history questions
    generateHistoryQuestion(difficulty, index) {
        const historyQuestions = [
            {
                question: "In which year did World War II end?",
                options: ["1945", "1939", "1918", "1950"],
                correctAnswer: "1945",
                explanation: "World War II ended in 1945"
            },
            {
                question: "Who was the first President of the United States?",
                options: ["George Washington", "Thomas Jefferson", "Abraham Lincoln", "John Adams"],
                correctAnswer: "George Washington",
                explanation: "George Washington served from 1789 to 1797"
            },
            {
                question: "Which civilization built the Pyramids of Giza?",
                options: ["Ancient Egyptians", "Romans", "Greeks", "Mayans"],
                correctAnswer: "Ancient Egyptians",
                explanation: "The Pyramids were built as tombs for pharaohs"
            },
            {
                question: "When was the Declaration of Independence signed?",
                options: ["1776", "1789", "1796", "1765"],
                correctAnswer: "1776",
                explanation: "The Declaration was signed in 1776"
            },
            {
                question: "Who discovered America in 1492?",
                options: ["Christopher Columbus", "Vasco da Gama", "Marco Polo", "Ferdinand Magellan"],
                correctAnswer: "Christopher Columbus",
                explanation: "Columbus reached the Americas in 1492"
            }
        ];

        return historyQuestions[index % historyQuestions.length];
    }

    // 📚 LITERATURE - Different literature questions
    generateLiteratureQuestion(difficulty, index) {
        const literatureQuestions = [
            {
                question: "Who wrote 'Romeo and Juliet'?",
                options: ["William Shakespeare", "Charles Dickens", "Jane Austen", "Mark Twain"],
                correctAnswer: "William Shakespeare",
                explanation: "Shakespeare wrote this famous tragedy"
            },
            {
                question: "Which novel begins with 'Call me Ishmael'?",
                options: ["Moby Dick", "1984", "The Great Gatsby", "War and Peace"],
                correctAnswer: "Moby Dick",
                explanation: "Moby Dick by Herman Melville starts with this line"
            },
            {
                question: "Who wrote 'Pride and Prejudice'?",
                options: ["Jane Austen", "Charlotte Bronte", "Emily Bronte", "George Eliot"],
                correctAnswer: "Jane Austen",
                explanation: "Jane Austen published Pride and Prejudice in 1813"
            },
            {
                question: "Which Shakespeare play features the character Hamlet?",
                options: ["Hamlet", "Macbeth", "Othello", "King Lear"],
                correctAnswer: "Hamlet",
                explanation: "Hamlet is the protagonist of Shakespeare's tragedy 'Hamlet'"
            },
            {
                question: "Who wrote 'The Great Gatsby'?",
                options: ["F. Scott Fitzgerald", "Ernest Hemingway", "John Steinbeck", "William Faulkner"],
                correctAnswer: "F. Scott Fitzgerald",
                explanation: "F. Scott Fitzgerald published The Great Gatsby in 1925"
            }
        ];

        return literatureQuestions[index % literatureQuestions.length];
    }

    // 🌍 GEOGRAPHY - Different geography questions
    generateGeographyQuestion(difficulty, index) {
        const geographyQuestions = [
            {
                question: "What is the longest river in the world?",
                options: ["Nile", "Amazon", "Yangtze", "Mississippi"],
                correctAnswer: "Nile",
                explanation: "The Nile River is approximately 6,650 km long"
            },
            {
                question: "Which is the largest ocean on Earth?",
                options: ["Pacific Ocean", "Atlantic Ocean", "Indian Ocean", "Arctic Ocean"],
                correctAnswer: "Pacific Ocean",
                explanation: "The Pacific Ocean covers about 46% of Earth's water surface"
            },
            {
                question: "What is the capital of Japan?",
                options: ["Tokyo", "Kyoto", "Osaka", "Seoul"],
                correctAnswer: "Tokyo",
                explanation: "Tokyo is the capital and largest city of Japan"
            },
            {
                question: "Which desert is the largest in the world?",
                options: ["Sahara Desert", "Arabian Desert", "Gobi Desert", "Kalahari Desert"],
                correctAnswer: "Sahara Desert",
                explanation: "The Sahara is the largest hot desert in the world"
            },
            {
                question: "What is the highest mountain in the world?",
                options: ["Mount Everest", "K2", "Kangchenjunga", "Makalu"],
                correctAnswer: "Mount Everest",
                explanation: "Mount Everest is 8,848 meters above sea level"
            }
        ];

        return geographyQuestions[index % geographyQuestions.length];
    }

    // 💻 COMPUTER SCIENCE - Different CS questions
    generateCSQuestion(difficulty, index) {
        const csQuestions = [
            {
                question: "What does CPU stand for?",
                options: ["Central Processing Unit", "Computer Processing Unit", "Central Program Unit", "Computer Program Unit"],
                correctAnswer: "Central Processing Unit",
                explanation: "CPU is the brain of the computer that processes instructions"
            },
            {
                question: "Which programming language is known for web development?",
                options: ["JavaScript", "Python", "C++", "Java"],
                correctAnswer: "JavaScript",
                explanation: "JavaScript is the primary language for web development"
            },
            {
                question: "What does HTML stand for?",
                options: ["HyperText Markup Language", "HighTech Modern Language", "HyperTransfer Markup Language", "HighText Machine Language"],
                correctAnswer: "HyperText Markup Language",
                explanation: "HTML is the standard markup language for web pages"
            },
            {
                question: "What is the time complexity of binary search?",
                options: ["O(log n)", "O(n)", "O(n²)", "O(1)"],
                correctAnswer: "O(log n)",
                explanation: "Binary search divides the search space in half each time"
            },
            {
                question: "Which data structure uses LIFO (Last In First Out)?",
                options: ["Stack", "Queue", "Array", "Linked List"],
                correctAnswer: "Stack",
                explanation: "Stack follows LIFO principle - last element added is first removed"
            }
        ];

        return csQuestions[index % csQuestions.length];
    }

    // ⚛️ PHYSICS - Different physics questions
    generatePhysicsQuestion(difficulty, index) {
        const physicsQuestions = [
            {
                question: "What is the unit of force?",
                options: ["Newton", "Joule", "Watt", "Pascal"],
                correctAnswer: "Newton",
                explanation: "Force is measured in Newtons (N)"
            },
            {
                question: "What is the speed of light in vacuum?",
                options: ["299,792,458 m/s", "300,000,000 m/s", "299,000,000 m/s", "301,000,000 m/s"],
                correctAnswer: "299,792,458 m/s",
                explanation: "The speed of light in vacuum is exactly 299,792,458 m/s"
            },
            {
                question: "Which law states F = ma?",
                options: ["Newton's Second Law", "Newton's First Law", "Newton's Third Law", "Law of Gravitation"],
                correctAnswer: "Newton's Second Law",
                explanation: "Newton's Second Law: Force equals mass times acceleration"
            },
            {
                question: "What is the SI unit of energy?",
                options: ["Joule", "Watt", "Newton", "Pascal"],
                correctAnswer: "Joule",
                explanation: "Energy is measured in Joules (J)"
            },
            {
                question: "Which subatomic particle has a positive charge?",
                options: ["Proton", "Electron", "Neutron", "Photon"],
                correctAnswer: "Proton",
                explanation: "Protons have positive charge, electrons negative, neutrons neutral"
            }
        ];

        return physicsQuestions[index % physicsQuestions.length];
    }

    // 🧪 CHEMISTRY - Different chemistry questions
    generateChemistryQuestion(difficulty, index) {
        const chemistryQuestions = [
            {
                question: "What is the chemical formula for water?",
                options: ["H₂O", "HO₂", "H₂O₂", "OH"],
                correctAnswer: "H₂O",
                explanation: "Water consists of two hydrogen atoms and one oxygen atom"
            },
            {
                question: "What is the atomic number of Hydrogen?",
                options: ["1", "2", "3", "4"],
                correctAnswer: "1",
                explanation: "Hydrogen has 1 proton in its nucleus"
            },
            {
                question: "What is the pH of pure water?",
                options: ["7", "0", "14", "1"],
                correctAnswer: "7",
                explanation: "Pure water is neutral with pH 7"
            },
            {
                question: "Which element is the most abundant in Earth's atmosphere?",
                options: ["Nitrogen", "Oxygen", "Carbon Dioxide", "Argon"],
                correctAnswer: "Nitrogen",
                explanation: "Nitrogen makes up about 78% of Earth's atmosphere"
            },
            {
                question: "What type of bond involves sharing electrons?",
                options: ["Covalent bond", "Ionic bond", "Hydrogen bond", "Metallic bond"],
                correctAnswer: "Covalent bond",
                explanation: "Covalent bonds involve sharing electron pairs between atoms"
            }
        ];

        return chemistryQuestions[index % chemistryQuestions.length];
    }

    // 🧬 BIOLOGY - Different biology questions
    generateBiologyQuestion(difficulty, index) {
        const biologyQuestions = [
            {
                question: "What is the basic unit of life?",
                options: ["Cell", "Atom", "Molecule", "Organ"],
                correctAnswer: "Cell",
                explanation: "The cell is the smallest unit that can live and reproduce"
            },
            {
                question: "How many chromosomes do humans have?",
                options: ["46", "23", "48", "24"],
                correctAnswer: "46",
                explanation: "Humans have 23 pairs of chromosomes, totaling 46"
            },
            {
                question: "What process do plants use to make food?",
                options: ["Photosynthesis", "Respiration", "Digestion", "Fermentation"],
                correctAnswer: "Photosynthesis",
                explanation: "Plants use sunlight to convert CO₂ and water into glucose"
            },
            {
                question: "Which organ pumps blood throughout the body?",
                options: ["Heart", "Liver", "Lungs", "Brain"],
                correctAnswer: "Heart",
                explanation: "The heart circulates blood through the circulatory system"
            },
            {
                question: "What is the study of heredity called?",
                options: ["Genetics", "Ecology", "Anatomy", "Physiology"],
                correctAnswer: "Genetics",
                explanation: "Genetics is the study of genes, genetic variation, and heredity"
            }
        ];

        return biologyQuestions[index % biologyQuestions.length];
    }

    // 🔄 GENERAL - Fallback generator
    generateGeneralQuestion(difficulty, index) {
        return {
            question: `What is an important concept in ${difficulty} level learning?`,
            options: ["Critical thinking", "Memorization", "Observation", "Experimentation"],
            correctAnswer: "Critical thinking",
            explanation: `This question tests ${difficulty} understanding of learning principles`
        };
    }

    // 🔧 UTILITY METHODS
    getRandomNumber(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    shuffleArray(array) {
        const shuffled = [...array];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        return shuffled;
    }

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}

module.exports = new QuizGenerator();