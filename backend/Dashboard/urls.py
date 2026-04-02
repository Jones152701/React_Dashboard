from django.urls import path
from .views import SocialMediaDailyView,LensAnalyticsView,CompetitorsView,CompetitorDetailView

urlpatterns = [
    path('social_media/', SocialMediaDailyView.as_view(), name='social_media_daily'),
    path('LensOverview/LensAnalytics',LensAnalyticsView.as_view(),name='lensanalytics'),
    path('competitors-plan',CompetitorsView.as_view(),name='competitorsplan'),
    path('competitor-detail', CompetitorDetailView.as_view(), name="competitordetail"),
]