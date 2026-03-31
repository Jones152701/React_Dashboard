from django.urls import path
from .views import SocialMediaDailyView,LensAnalyticsView,CompetitorsView

urlpatterns = [
    path('social_media/', SocialMediaDailyView.as_view(), name='social_media_daily'),
    path('LensOverview/LensAnalytics',LensAnalyticsView.as_view(),name='lensanalytics'),
    path('competitors-plan',CompetitorsView.as_view(),name='competitorsplan')
]