import axios from 'axios';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8000';

export class PredictService {
    
    static async getPrediction(requestData: any) {
        let mlResponse;
        try {
            const response = await axios.post(`${ML_SERVICE_URL}/internal/predict`, requestData);
            mlResponse = response.data;
        } catch (error) {
            console.error('Ошибка при обращении к сервису:', error);
            throw new Error('Service is unavailable');
        }

        const threatDetails = await prisma.threat.findUnique({
            where: { code: mlResponse.top_threat_code },
            include: { recommendations: true } 
        });

        const estimatedDamage = requestData.host_count * 10500;
        const requestId = `req-${Date.now()}`;

        if (!requestData.enterprise_code) {
            throw new Error('enterprise_code is required');
        }

        prisma.predictionLog.create({
            data: {
                request_id: requestId,
                enterprise_code: requestData.enterprise_code,
                probability: mlResponse.probability,
                predicted_threat: mlResponse.top_threat_code,
                predicted_cluster: mlResponse.cluster ?? null,
                predicted_object: requestData.object ?? 'unknown',
                season: requestData.season ?? 'unknown',
                day_of_week: requestData.day_of_week ?? 0,
                hour: requestData.hour ?? 0,
                minute: requestData.minute ?? null
            }
        }).catch((e: unknown) =>
            console.error('Ошибка сохранения лога:', e instanceof Error ? e.message : String(e))
        );

        return {
            request_id: requestId,
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
