import axios from 'axios';

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class PredictService {
    
    /**
     * Основная функция пайплайна прогнозирования
     */
    static async getPrediction(requestData: any) {
        // 1. Отправляем "сырые" фичи в Python микросервис
        let mlResponse;
        try {
            const response = await axios.post(`${ML_SERVICE_URL}/internal/predict`, requestData);
            mlResponse = response.data;
        } catch (error) {
            console.error('Ошибка при обращении к ML-сервису:', error);
            throw new Error('ML Service is unavailable');
        }

        // mlResponse будет содержать что-то вроде:
        // { probability: 0.85, top_threat_code: "190", object_code: "bios" }

        // 2. Идем в PostgreSQL за красивыми описаниями угрозы
        const threatDetails = await prisma.threat.findUnique({
            where: { code: mlResponse.top_threat_code },
            include: { recommendations: true } // Сразу тянем рекомендации!
        });

        // 3. Формируем бизнес-импакт (простая эвристика)
        const estimatedDamage = requestData.host_count * 10500; // например, 10.5к руб за хост

        // 4. Логируем предикт в базу (асинхронно, не блоча ответ)
        prisma.predictionLog.create({
            data: {
                enterprise_type: requestData.enterprise_type,
                host_count: requestData.host_count,
                region: requestData.region,
                predicted_risk: mlResponse.probability
            }
        }).catch((e: unknown) => console.error('Ошибка сохранения лога:', e));

        // 5. Собираем финальный богатый JSON по ТЗ фронта
        return {
            request_id: `req-${Date.now()}`,
            incident_prediction: {
                will_happen: mlResponse.probability > 0.5,
                probability: mlResponse.probability,
                confidence_level: mlResponse.probability > 0.8 ? 'high' : 'medium'
            },
            threat_prediction: {
                primary: {
                    threat_code: threatDetails?.code || mlResponse.top_threat_code,
                    threat_name: threatDetails?.name || 'Неизвестная угроза',
                    probability: mlResponse.threat_prob
                }
            },
            recommendations: ((threatDetails as any)?.recommendations || []).map((rec: any) => ({
                title: rec.title,
                priority_label: rec.priority_label
            })),
            business_impact: {
                estimated_damage_rub: estimatedDamage
            }
        };
    }
}
