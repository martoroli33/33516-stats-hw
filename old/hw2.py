import pandas as pd
import matplotlib.pyplot as plt

# https://www.kaggle.com/datasets/adharshinikumar/screentime-vs-mentalwellness-survey-2025
# Each row represents a unique participant and includes:
# Demographics (age, gender, occupation, student/working)
# Daily Screen Time (mobile, laptop, TV, total)
# Sleep Quality (self-reported rating)
# Stress Levels (scale 1–10)
# Productivity Score (self-perception)
# Mental Wellness Indicators (mood, energy, focus)

# Load dataset
dt = pd.read_csv("dataset/hw2.csv")

# Univariate distribution
## 1. Age
print("AGE -----------------")
print(dt.age.describe())
first_univ = dt.age.plot(
    kind = 'hist',
    bins = 45,
    # title = "Univariate distribution of age",
    xlabel = "Age",
    ylabel = "Frequency",
    xticks = list(range(10, 70, 5)),
    colormap = "cividis"
).get_figure()
first_univ.savefig('assets/hw2_age_univ.png', transparent=True)
plt.clf()

# ## 2. Stress Levels
print("SLEEP HOURS -----------------")
print(dt.sleep_hours.describe())
second_univ = dt.sleep_hours.plot(
    kind = 'hist',
    bins = 15,
    # title = "Univariate distribution of sleeping hours",
    xlabel = "Sleep hours",
    ylabel = "Frequency",
    colormap = "cividis"
).get_figure()
second_univ.savefig('assets/hw2_sleep_univ.png', transparent=True)
plt.clf()

# ## 3. Stress Levels
print("MENTAL WELLNESS -----------------")
print(dt.mental_wellness_index_0_100.describe())
third_univ = dt.mental_wellness_index_0_100.plot(
    kind = 'hist',
    bins = 50,
    # title = "Univariate distribution of mental wellness index",
    xlabel = "Mental wellness index (0 - 100)",
    ylabel = "Frequency",
    xticks = list(range(0, 100, 10)),
    colormap = "cividis"
).get_figure()
third_univ.savefig('assets/hw2_wellness_univ.png', transparent=True)
plt.clf()


# Bivariate distribution
print("BIVARIATE -----------------")
colors = {'Remote': 'darkblue', 'Hybrid': 'orange', 'In-person': 'seagreen'}
color_list = [colors[group] for group in dt['work_mode']]
biv = dt.plot.scatter(
    x = 'sleep_hours',
    y = 'leisure_screen_hours',
    c = color_list,
    # title = "Bivariate distribution of leisure screen use and sleep time",
    xlabel = "Sleep hours",
    ylabel = "Leisure screen hours"
).get_figure()
biv.savefig('assets/hw2_biv.png', transparent=True)
plt.clf()
